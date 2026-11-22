"""Santé du service : indique aussi quelle IA répond (utile avant de monter sur scène)."""

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.config import SettingsDep
from app.services import voice

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: str
    service: str
    ai: str
    # Une IA peut-elle lire un son (dictée, scan vocal) ? Seul Gemini, ou l'IA locale, le lit.
    audio: bool
    # La voix d'ElevenLabs lit-elle à voix haute ? Sinon, le site garde la voix du navigateur.
    voice: bool


@router.get("/health", operation_id="getHealth")
def get_health(settings: SettingsDep) -> HealthResponse:
    """« ok » si le service tourne ; `ai` vaut le mode (gemini, gemini-then-local, local),
    offline, ou not-configured (mode gemini sans aucune clé). Avec des clés, `ai` nomme les IA
    distantes qui en ont, dans l'ordre (par exemple « groq+gemini »)."""
    configured = [name for name in settings.ai_providers if settings.keys_for(name)]
    if settings.demo_offline:
        ai = "offline"
    elif settings.ai_mode != "gemini":
        ai = settings.ai_mode
    elif not configured:
        ai = "not-configured"
    else:
        ai = "+".join(configured)
    # La dictée : Groq Whisper (clés Groq) ; Gemini lit aussi le son, et l'IA locale (Gemma 4).
    audio = not settings.demo_offline and (
        voice.can_transcribe(settings)
        or settings.ai_mode != "gemini"
        or bool(settings.keys_for("gemini"))
    )
    return HealthResponse(
        status="ok", service="vyra-processing", ai=ai, audio=audio, voice=voice.can_speak(settings)
    )
