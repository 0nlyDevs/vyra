"""Rubriques de vérification et recherche Wikipédia (réseau simulé)."""

import asyncio

import httpx

from app.core.config import Settings
from app.services.fact_checks import find_fact_checks, is_fact_checker_url


def test_fact_checker_url_keeps_only_the_checking_section() -> None:
    assert is_fact_checker_url("https://factuel.afp.com/doc.afp.com.123")
    assert is_fact_checker_url("https://www.lemonde.fr/les-decodeurs/article/2026/11/01/x.html")
    assert not is_fact_checker_url("https://www.lemonde.fr/politique/article/2026/11/01/x.html")
    assert not is_fact_checker_url("https://exemple.mg/afp.com")


def test_wikipedia_answers_without_any_key() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/w/api.php":
            return httpx.Response(200, json={"query": {"search": [{"title": "Délestage"}]}})
        return httpx.Response(200, json={"extract": "Coupure volontaire de courant."})

    checks, wiki, searched = asyncio.run(
        find_fact_checks(
            Settings(_env_file=None),
            "Délestage de 72 heures annoncé",
            transport=httpx.MockTransport(handler),
        )
    )
    assert searched
    assert checks == []
    assert {article["language"] for article in wiki} == {"fr", "mg", "en"}
    assert wiki[0]["summary"] == "Coupure volontaire de courant."


def test_offline_searches_nothing() -> None:
    checks, wiki, searched = asyncio.run(
        find_fact_checks(
            Settings(_env_file=None, demo_offline=True), "Délestage de 72 heures annoncé"
        )
    )
    assert (checks, wiki, searched) == ([], [], False)
