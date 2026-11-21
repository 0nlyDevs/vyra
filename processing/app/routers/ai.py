"""Routes d'IA : un prompt générique et le calcul de vecteurs."""

from fastapi import APIRouter

from app.core.config import SettingsDep
from app.core.errors import AppError
from app.schemas.ai import EmbedRequest, EmbedResponse, PromptRequest, PromptResponse
from app.services import providers
from app.services.ai_service import UnknownPromptError, run_prompt
from app.services.llm_common import AiUnavailableError

router = APIRouter(prefix="/v1", tags=["ai"])

AI_UNAVAILABLE = AppError("AI_UNAVAILABLE", 503, "L'IA est momentanément indisponible.")


@router.post("/prompts/{name}", operation_id="runPrompt")
def run_named_prompt(name: str, body: PromptRequest, settings: SettingsDep) -> PromptResponse:
    """Lance le prompt `app/prompts/<name>.md` sur `payload`, avec secours hors ligne."""
    try:
        result, source = run_prompt(
            settings,
            name,
            body.payload,
            files=body.files,
            fallback_variant=body.fallback_variant,
        )
    except UnknownPromptError as exc:
        raise AppError("NOT_FOUND", 404, "Prompt introuvable.") from exc
    except AiUnavailableError as exc:
        raise AI_UNAVAILABLE from exc
    return PromptResponse(result=result, source=source)


@router.post("/embeddings", operation_id="embedTexts")
def embed(body: EmbedRequest, settings: SettingsDep) -> EmbedResponse:
    """Un vecteur par texte. Hors ligne : 503, le web passe alors à une recherche par mots."""
    try:
        vectors = providers.embed_texts(settings, body.texts)
    except AiUnavailableError as exc:
        raise AI_UNAVAILABLE from exc
    return EmbedResponse(vectors=vectors)
