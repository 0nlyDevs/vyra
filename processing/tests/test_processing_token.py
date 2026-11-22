"""En ligne, seul le serveur Next.js (qui connaît PROCESSING_TOKEN) peut appeler l'IA."""

from fastapi.testclient import TestClient

from app.main import create_app
from tests.conftest import make_settings

PROMPT = "/v1/prompts/summarize"
BODY = {"payload": {"notes": ["a"]}}


def _client() -> TestClient:
    settings = make_settings(demo_offline=True, processing_token="s3cret")
    return TestClient(create_app(settings), raise_server_exceptions=False)


def test_missing_or_wrong_token_is_refused() -> None:
    client = _client()
    assert client.post(PROMPT, json=BODY).status_code == 401
    assert client.post(PROMPT, json=BODY, headers={"X-Processing-Token": "nope"}).status_code == 401


def test_right_token_is_accepted() -> None:
    response = _client().post(PROMPT, json=BODY, headers={"X-Processing-Token": "s3cret"})
    assert response.status_code == 200


def test_health_stays_open() -> None:
    assert _client().get("/health").status_code == 200


def test_docs_are_hidden_online(offline_client: TestClient) -> None:
    for path in ("/docs", "/openapi.json"):
        assert _client().get(path).status_code == 404
    assert offline_client.get("/docs").status_code == 200


def test_no_token_configured_keeps_local_behaviour(offline_client: TestClient) -> None:
    assert offline_client.post(PROMPT, json=BODY).status_code == 200
