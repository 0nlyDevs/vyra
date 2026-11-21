"""IA locale (Ollama) et réponses de secours propres à un cas de démo."""

import json
import math

import httpx
import pytest
from fastapi.testclient import TestClient

from app.schemas.ai import InlineFile
from app.services import local_ai
from app.services.llm_common import AiUnavailableError
from tests.conftest import make_settings


def _transport(reply: dict[str, object], seen: list[dict[str, object]]) -> httpx.MockTransport:
    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(json.loads(request.content))
        return httpx.Response(200, json=reply)

    return httpx.MockTransport(handler)


def test_local_generation_sends_image_and_reads_json() -> None:
    seen: list[dict[str, object]] = []
    reply = {
        "choices": [{"message": {"content": '```json\n{"argument": "ok", "cited": [1]}\n```'}}]
    }
    settings = make_settings(ai_provider="local")
    image = InlineFile(mime_type="image/png", data="aGVsbG8=")
    result = local_ai.generate_json(
        settings, "consigne", {"claim": "x"}, files=[image], transport=_transport(reply, seen)
    )
    assert result == {"argument": "ok", "cited": [1]}
    parts = seen[0]["messages"][1]["content"]  # type: ignore[index]
    assert parts[1]["image_url"]["url"].startswith("data:image/png;base64,")


def test_local_embeddings_are_cut_to_the_column_size_and_normalized() -> None:
    seen: list[dict[str, object]] = []
    reply = {"data": [{"index": 0, "embedding": [3.0, 4.0, 12.0]}]}
    settings = make_settings(ai_provider="local", embedding_dimensions=2)
    [vector] = local_ai.embed_texts(settings, ["bonjour"], transport=_transport(reply, seen))
    assert vector == pytest.approx([0.6, 0.8])
    assert math.isclose(sum(v * v for v in vector), 1.0)
    assert seen[0]["input"] == ["task: sentence similarity | query: bonjour"]


def test_local_offline_mode_never_calls_the_model() -> None:
    with pytest.raises(AiUnavailableError):
        local_ai.generate_json(make_settings(ai_provider="local", demo_offline=True), "c", {})


def test_fallback_variant_is_used_when_it_exists(offline_client: TestClient) -> None:
    body = {"payload": {}, "fallbackVariant": "flood"}
    result = offline_client.post("/v1/prompts/judge", json=body).json()["result"]
    assert "2019" in result["conclusion"]


def test_unknown_fallback_variant_uses_the_general_fallback(offline_client: TestClient) -> None:
    body = {"payload": {}, "fallbackVariant": "does-not-exist"}
    response = offline_client.post("/v1/prompts/judge", json=body)
    assert response.status_code == 200
    assert response.json()["source"] == "fallback"
    assert "hors ligne" in response.json()["result"]["conclusion"]


def test_gemini_tries_the_next_model_when_the_first_is_overloaded() -> None:
    from app.services import gemini

    calls: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request.url.path)
        if "first-model" in request.url.path:
            return httpx.Response(503, json={"error": {"status": "UNAVAILABLE"}})
        reply = {"candidates": [{"content": {"parts": [{"text": '{"ok": true}'}]}}]}
        return httpx.Response(200, json=reply)

    settings = make_settings(
        gemini_api_key="test-key", gemini_model="first-model", gemini_fallback_models=["second"]
    )
    result = gemini.generate_json(settings, "c", {}, transport=httpx.MockTransport(handler))
    assert result == {"ok": True}
    assert [path.rsplit("/", 1)[-1] for path in calls] == [
        "first-model:generateContent",
        "second:generateContent",
    ]
