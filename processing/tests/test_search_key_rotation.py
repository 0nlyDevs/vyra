"""Rotation des clés de recherche (Tavily, Fact Check Tools), réseau simulé."""

import asyncio
import contextlib

import httpx
import pytest

from app.services import key_pool
from app.services.fact_checks import find_fact_checks
from app.services.web_search import WebSearchUnavailableError, find_articles
from tests.conftest import make_settings

AFP = "https://factuel.afp.com/doc.afp.com.123"
REVIEW = {"claims": [{"text": "x", "claimReview": [{"url": AFP, "title": "Faux"}]}]}


@pytest.fixture(autouse=True)
def fresh_pool(monkeypatch: pytest.MonkeyPatch) -> None:
    key_pool.reset()
    for name in (
        "TAVILY_API_KEY",
        "TAVILY_API_KEYS",
        "GOOGLE_FACTCHECK_API_KEY",
        "GOOGLE_FACTCHECK_API_KEYS",
    ):
        monkeypatch.delenv(name, raising=False)


def _network(statuses: dict[str, int], seen: list[tuple[str, str]]) -> httpx.MockTransport:
    """Tavily et Fact Check répondent selon la clé ; le reste (Wikipédia, GDELT) est vide."""

    def handler(request: httpx.Request) -> httpx.Response:
        key = request.headers.get("authorization", "").removeprefix("Bearer ") or (
            request.headers.get("x-goog-api-key", "")
        )
        seen.append((request.url.host, key))
        assert "key" not in request.url.params, "une clé ne part jamais dans l'adresse"
        if request.url.host == "api.tavily.com":
            status = statuses.get(key, 200)
            return httpx.Response(status, json={"results": [{"url": AFP, "title": "Faux"}]})
        if request.url.host == "factchecktools.googleapis.com":
            status = statuses.get(key, 200)
            body = REVIEW if status == 200 else {"error": {"message": "Quota exceeded"}}
            return httpx.Response(status, json=body)
        return httpx.Response(200, json={})

    return httpx.MockTransport(handler)


def test_key_lists_merge_with_the_single_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("TAVILY_API_KEYS", "t1, t2")
    monkeypatch.setenv("TAVILY_API_KEY", "t3")
    monkeypatch.setenv("GOOGLE_FACTCHECK_API_KEYS", "f1,f2")
    settings = make_settings()
    assert settings.keys_for("tavily") == ["t1", "t2", "t3"]
    assert settings.keys_for("factcheck") == ["f1", "f2"]


def test_exhausted_keys_hand_over_to_the_next_one() -> None:
    seen: list[tuple[str, str]] = []
    settings = make_settings(tavily_api_keys="t1,t2", google_factcheck_api_keys="f1,f2")
    transport = _network({"t1": 432, "f1": 429}, seen)

    checks, _, searched = asyncio.run(find_fact_checks(settings, "Rumeur", transport=transport))

    assert searched
    assert [check["url"] for check in checks] == [AFP]
    assert ("api.tavily.com", "t2") in seen
    assert ("factchecktools.googleapis.com", "f2") in seen
    # La clé épuisée est mise de côté : l'appel suivant commence par la bonne.
    seen.clear()
    asyncio.run(find_fact_checks(settings, "Rumeur", transport=transport))
    assert ("api.tavily.com", "t1") not in seen
    assert ("factchecktools.googleapis.com", "f1") not in seen


def test_web_search_falls_back_to_gdelt_when_every_tavily_key_rests() -> None:
    seen: list[tuple[str, str]] = []
    settings = make_settings(tavily_api_keys="t1,t2")
    transport = _network({"t1": 432, "t2": 429}, seen)
    with contextlib.suppress(WebSearchUnavailableError):
        asyncio.run(find_articles(settings, "Rumeur", transport=transport))
    assert {key for host, key in seen if host == "api.tavily.com"} == {"t1", "t2"}

    seen.clear()
    with contextlib.suppress(WebSearchUnavailableError):
        asyncio.run(find_articles(settings, "Rumeur", transport=transport))
    assert seen and all(host != "api.tavily.com" for host, _ in seen)
