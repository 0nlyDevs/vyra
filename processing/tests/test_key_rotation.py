"""Rotation des clés d'API et ordre des fournisseurs (groq, gemini, deepseek)."""

import httpx
import pytest

from app.schemas.ai import InlineFile
from app.services import gemini, key_pool, local_ai, openai_compat, providers
from app.services.llm_common import AiUnavailableError
from tests.conftest import make_settings

OK_CHAT = {"choices": [{"message": {"content": '{"ok": true}'}}]}
OK_GEMINI = {"candidates": [{"content": {"parts": [{"text": '{"ok": true}'}]}}]}


@pytest.fixture(autouse=True)
def fresh_pool(monkeypatch: pytest.MonkeyPatch) -> None:
    """État vierge, et aucune clé ni réglage venu de l'environnement du poste."""
    key_pool.reset()
    for name in (
        "AI_PROVIDERS",
        "AI_MODE",
        "GROQ_API_KEYS",
        "GEMINI_API_KEYS",
        "GEMINI_API_KEY",
        "DEEPSEEK_API_KEYS",
    ):
        monkeypatch.delenv(name, raising=False)


def _by_key(
    statuses: dict[str, int], ok: dict[str, object], seen: list[str]
) -> httpx.MockTransport:
    """Chaque clé a son statut ; la clé qui a appelé est notée (sans la clé entière)."""

    def handler(request: httpx.Request) -> httpx.Response:
        auth = request.headers.get("authorization", "").removeprefix("Bearer ")
        key = auth or request.headers.get("x-goog-api-key", "")
        seen.append(key)
        status = statuses.get(key, 200)
        if status != 200:
            return httpx.Response(status, json={"error": {"message": "rate limit"}})
        return httpx.Response(200, json=ok)

    return httpx.MockTransport(handler)


def test_comma_separated_variables_become_lists(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AI_PROVIDERS", "deepseek, groq")
    monkeypatch.setenv("GROQ_API_KEYS", "g1, g2 ,,g3")
    monkeypatch.setenv("GEMINI_API_KEYS", "m1,m2")
    monkeypatch.setenv("GEMINI_API_KEY", "m3")
    monkeypatch.setenv("DEEPSEEK_API_KEYS", "d1")
    settings = make_settings()
    assert settings.ai_providers == ["deepseek", "groq"]
    assert settings.keys_for("groq") == ["g1", "g2", "g3"]
    assert settings.keys_for("gemini") == ["m1", "m2", "m3"]
    assert settings.keys_for("deepseek") == ["d1"]


def test_default_order_is_groq_gemini_deepseek() -> None:
    assert make_settings().ai_providers == ["groq", "gemini", "deepseek"]


def test_unknown_provider_is_refused() -> None:
    with pytest.raises(ValueError, match="fournisseur inconnu"):
        make_settings(ai_providers="groq,openai")


def test_next_key_takes_over_when_the_first_hits_its_quota() -> None:
    seen: list[str] = []
    transport = _by_key({"k1": 429}, OK_CHAT, seen)
    settings = make_settings(groq_api_keys="k1,k2")
    result = openai_compat.generate_json(settings, "groq", "c", {}, transport=transport)
    assert result == {"ok": True}
    assert seen == ["k1", "k2"]


def test_exhausted_key_is_set_aside_and_the_good_one_comes_first() -> None:
    seen: list[str] = []
    transport = _by_key({"k1": 429}, OK_CHAT, seen)
    settings = make_settings(groq_api_keys="k1,k2")
    openai_compat.generate_json(settings, "groq", "c", {}, transport=transport)
    seen.clear()
    openai_compat.generate_json(settings, "groq", "c", {}, transport=transport)
    assert seen == ["k2"]  # k1 n'est pas réessayée avant la fin de sa mise de côté


def test_key_comes_back_after_its_cooldown(monkeypatch: pytest.MonkeyPatch) -> None:
    seen: list[str] = []
    transport = _by_key({"k1": 429}, OK_CHAT, seen)
    settings = make_settings(groq_api_keys="k1,k2", key_cooldown_seconds=60)
    clock = {"now": 1000.0}
    monkeypatch.setattr(key_pool.time, "monotonic", lambda: clock["now"])
    openai_compat.generate_json(settings, "groq", "c", {}, transport=transport)
    clock["now"] += 61
    transport2 = _by_key({}, OK_CHAT, seen)
    seen.clear()
    openai_compat.generate_json(settings, "groq", "c", {}, transport=transport2)
    # k2 a répondu en dernier : elle reste la première ; k1 est de nouveau utilisable.
    assert seen == ["k2"]
    assert "k1" in key_pool.available_keys("groq", ["k1", "k2"])


def test_all_keys_exhausted_raises_unavailable() -> None:
    transport = _by_key({"k1": 429, "k2": 429}, OK_CHAT, [])
    settings = make_settings(groq_api_keys="k1,k2")
    with pytest.raises(AiUnavailableError):
        openai_compat.generate_json(settings, "groq", "c", {}, transport=transport)
    # Et au deuxième appel, plus aucune requête : toutes les clés sont mises de côté.
    seen: list[str] = []
    with pytest.raises(AiUnavailableError):
        openai_compat.generate_json(settings, "groq", "c", {}, transport=_by_key({}, OK_CHAT, seen))
    assert seen == []


def test_refused_key_rotates_too() -> None:
    seen: list[str] = []
    transport = _by_key({"bad": 401}, OK_CHAT, seen)
    settings = make_settings(deepseek_api_keys="bad,good")
    assert openai_compat.generate_json(settings, "deepseek", "c", {}, transport=transport) == {
        "ok": True
    }
    assert seen == ["bad", "good"]


def test_a_server_error_does_not_burn_the_key() -> None:
    seen: list[str] = []
    transport = _by_key({"k1": 500}, OK_CHAT, seen)
    settings = make_settings(groq_api_keys="k1,k2")
    with pytest.raises(AiUnavailableError):
        openai_compat.generate_json(settings, "groq", "c", {}, transport=transport)
    assert seen == ["k1"]  # pas de rotation sur une panne du serveur


def test_gemini_keys_rotate_too() -> None:
    seen: list[str] = []
    transport = _by_key({"m1": 429}, OK_GEMINI, seen)
    settings = make_settings(gemini_api_keys="m1,m2", gemini_fallback_models=[])
    assert gemini.generate_json(settings, "c", {}, transport=transport) == {"ok": True}
    assert seen == ["m1", "m2"]


def test_keys_never_appear_in_logs(caplog: pytest.LogCaptureFixture) -> None:
    transport = _by_key({"secret-key-value": 429}, OK_CHAT, [])
    settings = make_settings(groq_api_keys="secret-key-value,other-key")
    with caplog.at_level("WARNING"):
        openai_compat.generate_json(settings, "groq", "c", {}, transport=transport)
    assert "secret-key-value" not in caplog.text
    assert "hors quota" in caplog.text


def _recording(monkeypatch: pytest.MonkeyPatch, down: set[str]) -> list[str]:
    calls: list[str] = []

    def fake_gemini(*_a: object, **_k: object) -> dict[str, object]:
        calls.append("gemini")
        if "gemini" in down:
            raise AiUnavailableError("down")
        return {"by": "gemini"}

    def fake_compat(_s: object, provider: str, *_a: object, **_k: object) -> dict[str, object]:
        calls.append(provider)
        if provider in down:
            raise AiUnavailableError("down")
        return {"by": provider}

    def fake_local(*_a: object, **_k: object) -> dict[str, object]:
        calls.append("local")
        return {"by": "local"}

    monkeypatch.setattr(gemini, "generate_json", fake_gemini)
    monkeypatch.setattr(openai_compat, "generate_json", fake_compat)
    monkeypatch.setattr(local_ai, "generate_json", fake_local)
    return calls


def test_providers_are_tried_in_order_groq_gemini_deepseek(monkeypatch: pytest.MonkeyPatch) -> None:
    calls = _recording(monkeypatch, down={"groq", "gemini"})
    result = providers.generate_json(make_settings(), "c", {})
    assert result == {"by": "deepseek"}
    assert calls == ["groq", "gemini", "deepseek"]


def test_first_provider_answers_alone(monkeypatch: pytest.MonkeyPatch) -> None:
    calls = _recording(monkeypatch, down=set())
    assert providers.generate_json(make_settings(), "c", {}) == {"by": "groq"}
    assert calls == ["groq"]


def test_order_follows_ai_providers(monkeypatch: pytest.MonkeyPatch) -> None:
    calls = _recording(monkeypatch, down={"deepseek"})
    settings = make_settings(ai_providers="deepseek,gemini")
    assert providers.generate_json(settings, "c", {}) == {"by": "gemini"}
    assert calls == ["deepseek", "gemini"]


def test_a_file_skips_the_providers_that_cannot_read_it(monkeypatch: pytest.MonkeyPatch) -> None:
    calls = _recording(monkeypatch, down=set())
    files = [InlineFile(mimeType="image/png", data="AAAA")]
    assert providers.generate_json(make_settings(), "c", {}, files=files) == {"by": "gemini"}
    assert calls == ["gemini"]


def test_local_comes_last_when_every_remote_provider_is_down(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls = _recording(monkeypatch, down={"groq", "gemini", "deepseek"})
    settings = make_settings(ai_mode="gemini-then-local")
    assert providers.generate_json(settings, "c", {}) == {"by": "local"}
    assert calls == ["groq", "gemini", "deepseek", "local"]


def test_nothing_configured_is_unavailable_so_the_prepared_answer_shows() -> None:
    with pytest.raises(AiUnavailableError):
        providers.generate_json(make_settings(), "c", {})


def test_health_names_the_configured_providers() -> None:
    from fastapi.testclient import TestClient

    from app.main import create_app

    settings = make_settings(groq_api_keys="g1", gemini_api_keys="m1,m2")
    client = TestClient(create_app(settings))
    assert client.get("/health").json()["ai"] == "groq+gemini"


def test_api_addresses_come_from_the_settings() -> None:
    hosts: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        hosts.append(f"{request.url.host}{request.url.path}")
        return httpx.Response(200, json=OK_CHAT if "chat" in request.url.path else OK_GEMINI)

    transport = httpx.MockTransport(handler)
    settings = make_settings(
        groq_api_keys="g",
        gemini_api_keys="m",
        groq_base_url="https://groq.example.test/v9/",  # le « / » final est retiré
        gemini_base_url="https://gem.example.test/models",
        gemini_fallback_models=[],
    )
    openai_compat.generate_json(settings, "groq", "c", {}, transport=transport)
    gemini.generate_json(settings, "c", {}, transport=transport)
    assert hosts[0] == "groq.example.test/v9/chat/completions"
    assert hosts[1].startswith("gem.example.test/models/")
    assert make_settings().base_url_for("deepseek") == "https://api.deepseek.com"


def test_health_says_whether_an_ai_can_read_sound() -> None:
    from fastapi.testclient import TestClient

    from app.main import create_app

    def audio(**overrides: object) -> bool:
        client = TestClient(create_app(make_settings(**overrides)))
        return client.get("/health").json()["audio"]

    assert audio(deepseek_api_keys="d1") is False  # DeepSeek ne lit pas le son
    assert audio(groq_api_keys="g1", deepseek_api_keys="d1") is False
    assert audio(gemini_api_keys="m1") is True
    assert audio(ai_mode="local") is True  # Gemma 4 en local lit le son
    assert audio(gemini_api_keys="m1", demo_offline=True) is False
