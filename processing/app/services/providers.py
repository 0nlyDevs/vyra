"""Quelle IA répond, selon le mode choisi dans `processing/.env` (`AI_MODE`).

- « gemini » (par défaut) : Gemini seul ;
- « gemini-then-local » : Gemini, puis Gemma 4 en local (Ollama) si Gemini ne répond pas ;
- « local » : Gemma 4 en local seul.

Le reste du service passe uniquement par ce module. Si aucune IA ne répond, `ai_service` affiche
la réponse préparée.
"""

import logging
from typing import Any

from app.core.config import Settings
from app.schemas.ai import InlineFile
from app.services import gemini, local_ai
from app.services.llm_common import AiUnavailableError

logger = logging.getLogger(__name__)

CHAINS = {
    "gemini": ("gemini",),
    "gemini-then-local": ("gemini", "local"),
    "local": ("local",),
}


def generate_json(
    settings: Settings,
    system_prompt: str,
    payload: dict[str, Any],
    *,
    files: list[InlineFile] | None = None,
) -> dict[str, Any]:
    """Les IA du mode, dans l'ordre. Lève AiUnavailableError si aucune ne répond."""
    chain = CHAINS[settings.ai_mode]
    for index, provider in enumerate(chain):
        try:
            if provider == "local":
                local_settings = settings if index == 0 else _as_backup(settings)
                return local_ai.generate_json(local_settings, system_prompt, payload, files=files)
            return gemini.generate_json(settings, system_prompt, payload, files=files)
        except AiUnavailableError:
            if index == len(chain) - 1:
                raise
            logger.warning("ia : %s ne répond pas, relais par %s", provider, chain[index + 1])
    raise AiUnavailableError("no provider")


def _as_backup(settings: Settings) -> Settings:
    timeout = min(settings.local_ai_timeout_seconds, settings.local_ai_backup_timeout_seconds)
    return settings.model_copy(update={"local_ai_timeout_seconds": timeout})


def embed_texts(settings: Settings, texts: list[str]) -> list[list[float]]:
    """L'IA principale du mode, sans relais : les vecteurs de deux modèles ne se comparent pas.
    Sans elle, la recherche se fait par les mots."""
    if settings.ai_mode == "local":
        return local_ai.embed_texts(settings, texts)
    return gemini.embed_texts(settings, texts)
