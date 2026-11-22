"""La voix : transcrire une dictée (Groq Whisper) et lire un texte à voix haute (ElevenLabs).

Les deux passent par la rotation des clés (`key_pool`) : quand une clé atteint son quota, la
suivante prend le relais. Sans clé, `AiUnavailableError` : le site propose alors la voix du
navigateur, ou rend la dictée indisponible. On n'appelle pas ces fonctions depuis un autre service
que `routers/voice.py`.
"""

import hashlib
import logging
import re
import threading
from collections import OrderedDict

import httpx

from app.core.config import Settings
from app.services import key_pool
from app.services.connect_retry import call_with_connect_retry
from app.services.llm_common import AiUnavailableError

logger = logging.getLogger(__name__)

# Les enregistrements acceptés : le navigateur envoie du WAV (voir web/src/features/dictation).
AUDIO_EXTENSIONS = {
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/mp4": "m4a",
    "audio/mpeg": "mp3",
}
STT_TIMEOUT_SECONDS = 60.0
TTS_TIMEOUT_SECONDS = 30.0
# Les derniers textes déjà lus : relire le même ne dépense pas de crédits ElevenLabs deux fois.
_CACHE_SIZE = 64
_cache: OrderedDict[str, bytes] = OrderedDict()
_cache_lock = threading.Lock()


def can_transcribe(settings: Settings) -> bool:
    return not settings.demo_offline and bool(settings.keys_for("groq"))


def can_speak(settings: Settings) -> bool:
    return not settings.demo_offline and bool(settings.keys_for("elevenlabs"))


def transcribe(
    settings: Settings,
    raw: bytes,
    mime: str,
    *,
    language: str = "fr",
    transport: httpx.BaseTransport | None = None,
) -> str:
    """Le texte dit dans l'enregistrement, par Whisper chez Groq."""
    if not can_transcribe(settings):
        raise AiUnavailableError("stt : offline or not configured")
    extension = AUDIO_EXTENSIONS.get(mime.split(";")[0].strip().lower(), "wav")
    url = f"{settings.groq_base_url}/audio/transcriptions"

    def call(key: str) -> dict[str, object]:
        with httpx.Client(transport=transport) as client:
            response = call_with_connect_retry(
                lambda: client.post(
                    url,
                    headers={"authorization": f"Bearer {key}"},
                    data={
                        "model": settings.stt_model,
                        "language": language,
                        "response_format": "json",
                        "temperature": "0",
                    },
                    files={"file": (f"dictee.{extension}", raw, mime)},
                    timeout=STT_TIMEOUT_SECONDS,
                ),
                deadline=None,
            )
        response.raise_for_status()
        data = response.json()
        if not isinstance(data, dict):
            raise ValueError("unexpected response")
        return data

    try:
        data = key_pool.call_with_rotation("groq-stt", settings.keys_for("groq"), settings, call)
        return str(data.get("text", "")).strip()
    except AiUnavailableError:
        raise
    except (httpx.HTTPError, ValueError) as exc:
        logger.warning("stt : transcription impossible (%s)", type(exc).__name__)
        raise AiUnavailableError(type(exc).__name__) from exc


def clean_for_speech(text: str) -> str:
    """Le texte tel qu'on le dit : sans renvois [1], sans gras Markdown, espaces propres."""
    text = re.sub(r"\[\d+\]|\*\*|`", "", text)
    text = re.sub(r"\s+", " ", text)
    return re.sub(r"\s+([.,;:!?])", r"\1", text).strip()


def speak(settings: Settings, text: str, *, transport: httpx.BaseTransport | None = None) -> bytes:
    """Le texte lu à voix haute (MP3), par ElevenLabs."""
    if not can_speak(settings):
        raise AiUnavailableError("tts : offline or not configured")
    text = clean_for_speech(text)
    if not text:
        raise AiUnavailableError("tts : empty text")
    cache_key = hashlib.sha256(
        f"{settings.elevenlabs_voice_id}|{settings.elevenlabs_model}|{text}".encode()
    ).hexdigest()
    with _cache_lock:
        if cache_key in _cache:
            _cache.move_to_end(cache_key)
            return _cache[cache_key]
    url = f"{settings.elevenlabs_base_url}/text-to-speech/{settings.elevenlabs_voice_id}"

    def call(key: str) -> bytes:
        with httpx.Client(transport=transport) as client:
            response = call_with_connect_retry(
                lambda: client.post(
                    url,
                    params={"output_format": "mp3_44100_64"},
                    headers={"xi-api-key": key, "accept": "audio/mpeg"},
                    json={
                        "text": text,
                        "model_id": settings.elevenlabs_model,
                        "language_code": "fr",
                    },
                    timeout=TTS_TIMEOUT_SECONDS,
                ),
                deadline=None,
            )
        response.raise_for_status()
        return response.content

    try:
        audio = key_pool.call_with_rotation(
            "elevenlabs", settings.keys_for("elevenlabs"), settings, call
        )
    except AiUnavailableError:
        raise
    except httpx.HTTPError as exc:
        logger.warning("tts : lecture impossible (%s)", type(exc).__name__)
        raise AiUnavailableError(type(exc).__name__) from exc
    with _cache_lock:
        _cache[cache_key] = audio
        while len(_cache) > _CACHE_SIZE:
            _cache.popitem(last=False)
    return audio
