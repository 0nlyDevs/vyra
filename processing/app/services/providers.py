"""Choix du fournisseur d'IA : Gemini (API gratuite, par défaut) ou un modèle local (Ollama).

Le reste du service passe uniquement par ce module : changer de fournisseur se fait dans
`processing/.env` (`AI_PROVIDER`), sans toucher au code.
"""

from typing import Any

from app.core.config import Settings
from app.schemas.ai import InlineFile
from app.services import gemini, local_ai


def generate_json(
    settings: Settings,
    system_prompt: str,
    payload: dict[str, Any],
    *,
    files: list[InlineFile] | None = None,
) -> dict[str, Any]:
    if settings.ai_provider == "local":
        return local_ai.generate_json(settings, system_prompt, payload, files=files)
    return gemini.generate_json(settings, system_prompt, payload, files=files)


def embed_texts(settings: Settings, texts: list[str]) -> list[list[float]]:
    if settings.ai_provider == "local":
        return local_ai.embed_texts(settings, texts)
    return gemini.embed_texts(settings, texts)
