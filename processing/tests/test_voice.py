"""La voix : dictée (Groq Whisper) et lecture à voix haute (ElevenLabs), avec rotation des clés."""

import httpx
import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.services import key_pool, voice
from app.services.llm_common import AiUnavailableError
from tests.conftest import make_settings


@pytest.fixture(autouse=True)
def fresh_state(monkeypatch: pytest.MonkeyPatch) -> None:
    key_pool.reset()
    voice._cache.clear()
    for name in ("GROQ_API_KEYS", "ELEVENLABS_API_KEYS", "AI_MODE", "GEMINI_API_KEYS"):
        monkeypatch.delenv(name, raising=False)


def _transport(statuses: dict[str, int], seen: list[str], body: object, kind: str = "json"):
    def handler(request: httpx.Request) -> httpx.Response:
        key = request.headers.get("authorization", "").removeprefix(
            "Bearer "
        ) or request.headers.get("xi-api-key", "")
        seen.append(key)
        status = statuses.get(key, 200)
        if status != 200:
            return httpx.Response(status, json={"error": "limite"})
        if kind == "audio":
            return httpx.Response(200, content=body, headers={"content-type": "audio/mpeg"})
        return httpx.Response(200, json=body)

    return httpx.MockTransport(handler)


def test_transcription_goes_to_groq_whisper_with_the_audio_file() -> None:
    sent: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        sent.append(request)
        return httpx.Response(200, json={"text": "  Il pleut sur Tamatave.  "})

    settings = make_settings(groq_api_keys="g1")
    text = voice.transcribe(
        settings, b"RIFFdata", "audio/wav", transport=httpx.MockTransport(handler)
    )
    assert text == "Il pleut sur Tamatave."
    request = sent[0]
    assert str(request.url) == "https://api.groq.com/openai/v1/audio/transcriptions"
    assert request.headers["authorization"] == "Bearer g1"
    body = request.read()
    assert b"whisper-large-v3" in body and b'name="language"' in body and b"dictee.wav" in body


def test_transcription_rotates_to_the_next_groq_key_on_a_quota() -> None:
    seen: list[str] = []
    transport = _transport({"g1": 429}, seen, {"text": "bonjour"})
    settings = make_settings(groq_api_keys="g1,g2")
    assert voice.transcribe(settings, b"x", "audio/wav", transport=transport) == "bonjour"
    assert seen == ["g1", "g2"]


def test_transcription_without_a_groq_key_is_unavailable() -> None:
    with pytest.raises(AiUnavailableError):
        voice.transcribe(make_settings(), b"x", "audio/wav")
    with pytest.raises(AiUnavailableError):
        voice.transcribe(make_settings(groq_api_keys="g1", demo_offline=True), b"x", "audio/wav")


def test_speech_returns_the_mp3_and_rotates_elevenlabs_keys() -> None:
    seen: list[str] = []
    transport = _transport({"e1": 429}, seen, b"MP3DATA", kind="audio")
    settings = make_settings(elevenlabs_api_keys="e1,e2")
    assert voice.speak(settings, "Bonjour [1] **à tous**", transport=transport) == b"MP3DATA"
    assert seen == ["e1", "e2"]


def test_the_same_text_is_not_read_twice() -> None:
    seen: list[str] = []
    transport = _transport({}, seen, b"MP3", kind="audio")
    settings = make_settings(elevenlabs_api_keys="e1")
    voice.speak(settings, "Un texte déjà lu.", transport=transport)
    voice.speak(settings, "Un texte déjà lu.", transport=transport)
    assert seen == ["e1"]  # le deuxième appel vient de la mémoire : aucun crédit dépensé


def test_speech_sends_french_and_the_configured_voice() -> None:
    sent: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        sent.append(request)
        return httpx.Response(200, content=b"MP3")

    settings = make_settings(elevenlabs_api_keys="e1", elevenlabs_voice_id="voixTest")
    voice.speak(settings, "Bonsoir.", transport=httpx.MockTransport(handler))
    assert sent[0].url.path.endswith("/text-to-speech/voixTest")
    assert b'"language_code":"fr"' in sent[0].read() or b'"language_code": "fr"' in sent[0].read()


def test_speech_without_a_key_is_unavailable() -> None:
    with pytest.raises(AiUnavailableError):
        voice.speak(make_settings(), "Bonjour")


def test_text_is_cleaned_for_speech() -> None:
    assert voice.clean_for_speech("Bonjour [1] **le monde** !  ") == "Bonjour le monde!"


def test_routes_answer_unavailable_without_keys() -> None:
    client = TestClient(create_app(make_settings()), raise_server_exceptions=False)
    audio = client.post("/v1/transcribe", content=b"x", headers={"content-type": "audio/wav"})
    assert audio.status_code == 503
    assert client.post("/v1/speech", json={"text": "Bonjour"}).status_code == 503
    assert (
        client.post(
            "/v1/transcribe", content=b"x", headers={"content-type": "text/plain"}
        ).status_code
        == 415
    )
    assert (
        client.post(
            "/v1/transcribe", content=b"", headers={"content-type": "audio/wav"}
        ).status_code
        == 413
    )


def test_health_reports_the_voice() -> None:
    health = (
        TestClient(create_app(make_settings(groq_api_keys="g1", elevenlabs_api_keys="e1")))
        .get("/health")
        .json()
    )
    assert health["audio"] is True and health["voice"] is True
    only_deepseek = (
        TestClient(create_app(make_settings(deepseek_api_keys="d1"))).get("/health").json()
    )
    assert only_deepseek["audio"] is False and only_deepseek["voice"] is False
