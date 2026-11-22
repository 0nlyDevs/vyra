"""Routes de voix : dictée (Groq Whisper) et lecture à voix haute (ElevenLabs)."""

from fastapi import APIRouter, Request, Response
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from app.core.config import SettingsDep
from app.core.errors import AppError
from app.services import voice
from app.services.llm_common import AiUnavailableError

router = APIRouter(prefix="/v1", tags=["voice"])

MAX_AUDIO_BYTES = 3 * 1024 * 1024  # une minute de dictée en WAV
MAX_SPEECH_CHARS = 900

UNAVAILABLE = AppError("AI_UNAVAILABLE", 503, "La voix est momentanément indisponible.")


class TranscriptResponse(BaseModel):
    text: str


class SpeechRequest(BaseModel):
    text: str = Field(min_length=1, max_length=MAX_SPEECH_CHARS)


@router.post("/transcribe", operation_id="transcribeAudio")
async def transcribe(request: Request, settings: SettingsDep) -> TranscriptResponse:
    """Le texte dit dans l'enregistrement envoyé tel quel (corps de la requête, `audio/*`)."""
    mime = request.headers.get("content-type", "").split(";")[0].strip().lower()
    if not mime.startswith("audio/"):
        raise AppError("VALIDATION_FAILED", 415, "Envoyez l'enregistrement en audio/*.")
    raw = await request.body()
    if not raw or len(raw) > MAX_AUDIO_BYTES:
        raise AppError("VALIDATION_FAILED", 413, "Enregistrement vide ou trop long.")
    try:
        text = await run_in_threadpool(voice.transcribe, settings, raw, mime)
    except AiUnavailableError as exc:
        raise UNAVAILABLE from exc
    return TranscriptResponse(text=text)


@router.post("/speech", operation_id="speakText", response_class=Response)
async def speech(body: SpeechRequest, settings: SettingsDep) -> Response:
    """Le texte lu à voix haute, en MP3."""
    try:
        audio = await run_in_threadpool(voice.speak, settings, body.text)
    except AiUnavailableError as exc:
        raise UNAVAILABLE from exc
    return Response(content=audio, media_type="audio/mpeg")
