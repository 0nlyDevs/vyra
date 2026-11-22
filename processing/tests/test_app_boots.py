"""Le service démarre, et le plan B (réponses de secours) marche sans réseau."""

from fastapi.testclient import TestClient

from app.services.news_feeds import parse_feed


def test_health_reports_offline_mode(offline_client: TestClient) -> None:
    response = offline_client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "vyra-processing", "ai": "offline"}


def test_prompt_uses_fallback_when_offline(offline_client: TestClient) -> None:
    response = offline_client.post("/v1/prompts/summarize", json={"payload": {"notes": ["a"]}})
    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "fallback"
    assert body["result"]["summary"]


def test_unknown_prompt_is_404(offline_client: TestClient) -> None:
    response = offline_client.post("/v1/prompts/does-not-exist", json={"payload": {}})
    assert response.status_code == 404


def test_web_sources_use_fallback_when_offline(offline_client: TestClient) -> None:
    response = offline_client.post("/v1/web-sources", json={"claim": "Une information à vérifier"})
    assert response.status_code == 200
    assert response.json() == {"articles": [], "source": "fallback"}


def test_news_feed_parsing_reads_rss_and_atom() -> None:
    rss = (
        "<rss><channel><item><title>Coupure d&#39;eau</title><link>https://a.mg/1</link>"
        "<description>&lt;p&gt;Lundi de 10 h à 14 h&lt;/p&gt;</description>"
        "<pubDate>Thu, 12 Nov 2026 08:00:00 GMT</pubDate></item></channel></rss>"
    )
    atom = (
        '<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Cyclone</title>'
        '<link href="https://b.re/2"/><updated>2026-11-13T09:00:00Z</updated></entry></feed>'
    )
    [first] = parse_feed(rss, "Journal A")
    assert (first.title, first.summary) == ("Coupure d'eau", "Lundi de 10 h à 14 h")
    assert first.published_at == "2026-11-12T08:00:00+00:00"
    [second] = parse_feed(atom, "Journal B")
    assert (second.url, second.published_at) == ("https://b.re/2", "2026-11-13T09:00:00+00:00")


def test_embeddings_unavailable_offline(offline_client: TestClient) -> None:
    response = offline_client.post("/v1/embeddings", json={"texts": ["bonjour"]})
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "AI_UNAVAILABLE"
