"""Le service démarre, et le plan B (réponses de secours) marche sans réseau."""

from fastapi.testclient import TestClient


def test_health_reports_offline_mode(offline_client: TestClient) -> None:
    response = offline_client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "mindstack-processing", "ai": "offline"}


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


def test_embeddings_unavailable_offline(offline_client: TestClient) -> None:
    response = offline_client.post("/v1/embeddings", json={"texts": ["bonjour"]})
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "AI_UNAVAILABLE"
