"""Nouvel essai quand la résolution des noms échoue (DNS du conteneur instable, 21/11)."""

import asyncio
import json
import time
from collections.abc import Callable

import httpx
import pytest

from app.services import connect_retry, gemini, news_feeds, web_search
from app.services.llm_common import AiUnavailableError
from tests.conftest import make_settings

DNS_ERROR = "[Errno -5] No address associated with hostname"
Reply = Callable[[httpx.Request], httpx.Response]


@pytest.fixture(autouse=True)
def no_pause(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(connect_retry, "RETRY_PAUSE_SECONDS", 0.0)


def _flaky(
    reply: Reply, failures: int = 2, seen: list[httpx.Request] | None = None
) -> tuple[httpx.MockTransport, dict[str, int]]:
    """Chaque requête échoue `failures` fois à la résolution du nom, puis reçoit `reply`."""
    calls: dict[str, int] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        if seen is not None:
            seen.append(request)
        key = f"{request.method} {request.url} {request.content.decode()}"
        calls[key] = calls.get(key, 0) + 1
        if calls[key] <= failures:
            raise httpx.ConnectError(DNS_ERROR, request=request)
        return reply(request)

    return httpx.MockTransport(handler), calls


def test_gemini_generation_survives_two_dns_failures() -> None:
    seen: list[httpx.Request] = []

    def reply(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200, json={"candidates": [{"content": {"parts": [{"text": '{"ok": true}'}]}}]}
        )

    transport, calls = _flaky(reply, seen=seen)
    settings = make_settings(gemini_api_key="test-key", gemini_fallback_models=[])
    assert gemini.generate_json(settings, "consigne", {"claim": "x"}, transport=transport) == {
        "ok": True
    }
    assert list(calls.values()) == [3]
    # Les nouveaux essais restent dans le temps prévu pour l'appel, sans le rallonger.
    timeouts = [request.extensions["timeout"]["read"] for request in seen]
    assert max(timeouts) <= settings.ai_timeout_seconds
    assert timeouts == sorted(timeouts, reverse=True)


def test_gemini_embeddings_survive_two_dns_failures() -> None:
    def reply(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"embeddings": [{"values": [0.1, 0.2]}]})

    transport, calls = _flaky(reply)
    settings = make_settings(gemini_api_key="test-key")
    assert gemini.embed_texts(settings, ["bonjour"], transport=transport) == [[0.1, 0.2]]
    assert list(calls.values()) == [3]


def test_gemini_gives_up_after_four_connection_failures() -> None:
    def reply(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={})

    transport, calls = _flaky(reply, failures=10)
    settings = make_settings(gemini_api_key="test-key", gemini_fallback_models=[])
    with pytest.raises(AiUnavailableError, match="ConnectError"):
        gemini.generate_json(settings, "consigne", {}, transport=transport)
    assert list(calls.values()) == [connect_retry.CONNECT_ATTEMPTS]


def test_server_errors_are_not_retried_on_the_same_model() -> None:
    calls: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request.url.path)
        return httpx.Response(503, json={"error": {"status": "UNAVAILABLE"}})

    settings = make_settings(gemini_api_key="test-key", gemini_fallback_models=[])
    with pytest.raises(AiUnavailableError):
        gemini.generate_json(settings, "consigne", {}, transport=httpx.MockTransport(handler))
    assert len(calls) == 1


def test_no_new_attempt_when_the_deadline_is_too_close() -> None:
    attempts: list[int] = []

    def send() -> None:
        attempts.append(1)
        raise httpx.ConnectError(DNS_ERROR)

    with pytest.raises(httpx.ConnectError):
        connect_retry.call_with_connect_retry(send, deadline=time.monotonic() + 0.5)
    assert len(attempts) == 1


def test_tavily_search_survives_two_dns_failures() -> None:
    def reply(request: httpx.Request) -> httpx.Response:
        topic = json.loads(request.content)["topic"]
        item = {
            "url": f"https://exemple.mg/{topic}",
            "title": f"Article {topic}",
            "content": "Le texte de l'article.",
            "published_date": "Thu, 12 Nov 2026 00:00:00 GMT",
        }
        return httpx.Response(200, json={"results": [item]})

    transport, calls = _flaky(reply)
    settings = make_settings(tavily_api_key="test-key")
    articles, engine = asyncio.run(
        web_search.find_articles(settings, "Coupure d'eau à Antananarivo", transport=transport)
    )
    assert engine == "tavily"
    assert sorted(article.url for article in articles) == [
        "https://exemple.mg/general",
        "https://exemple.mg/news",
    ]
    assert sorted(calls.values()) == [3, 3]


def test_gdelt_search_and_page_reading_survive_two_dns_failures() -> None:
    page = (
        "<html><head><title>Cyclone : Toamasina en alerte</title>"
        '<meta property="article:published_time" content="2026-11-12T08:00:00Z">'
        "</head><body></body></html>"
    )

    def reply(request: httpx.Request) -> httpx.Response:
        if request.url.host == "api.gdeltproject.org":
            item = {"url": "https://exemple.mg/cyclone", "title": "Cyclone", "domain": "exemple.mg"}
            return httpx.Response(200, json={"articles": [item]})
        return httpx.Response(200, html=page)

    transport, calls = _flaky(reply)
    articles, engine = asyncio.run(
        web_search.find_articles(
            make_settings(), "Le cyclone Batsirai frappe Toamasina", transport=transport
        )
    )
    assert engine == "gdelt"
    [article] = articles
    # Le titre et la date viennent de la page : elle a bien été lue au troisième essai.
    assert article.title == "Cyclone : Toamasina en alerte"
    assert article.published_at == "2026-11-12T08:00:00+00:00"
    assert sorted(calls.values()) == [3, 3]


def test_press_feed_survives_two_dns_failures() -> None:
    rss = (
        "<rss><channel><item><title>Délestage à Antananarivo</title>"
        "<link>https://exemple.mg/delestage</link></item></channel></rss>"
    )

    def reply(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text=rss)

    transport, calls = _flaky(reply)
    items, read = asyncio.run(
        news_feeds.read_feeds([("https://exemple.mg/rss", "Exemple")], transport=transport)
    )
    assert read == 1
    assert [item.url for item in items] == ["https://exemple.mg/delestage"]
    assert list(calls.values()) == [3]
