"""Quelle IA répond, dans quel ordre, selon `processing/.env`.

Les IA distantes (`AI_PROVIDERS`, par défaut `groq,gemini,deepseek`) sont essayées dans cet ordre :
une IA sans clé, hors quota (toutes ses clés, voir `key_pool`) ou en panne laisse la place à la
suivante. Le mode (`AI_MODE`) décide du local :

- « gemini » (par défaut) : les IA distantes seules ;
- « gemini-then-local » : les IA distantes, puis Gemma 4 en local (Ollama) si aucune ne répond ;
- « local » : Gemma 4 en local seul.

Le reste du service passe uniquement par ce module. Si aucune IA ne répond, `ai_service` affiche
la réponse préparée.
"""

import logging
from typing import Any

from app.core.config import Settings
from app.schemas.ai import InlineFile
from app.services import gemini, local_ai, openai_compat
from app.services.llm_common import AiUnavailableError

logger = logging.getLogger(__name__)

# Les IA distantes qui lisent une image ou un son joint : seul Gemini.
FILE_PROVIDERS = ("gemini",)


def _chain(settings: Settings, has_files: bool) -> list[str]:
    chain: list[str] = []
    if settings.ai_mode != "local":
        chain += [name for name in settings.ai_providers if not has_files or name in FILE_PROVIDERS]
    if settings.ai_mode in ("local", "gemini-then-local"):
        chain.append("local")
    return chain


def generate_json(
    settings: Settings,
    system_prompt: str,
    payload: dict[str, Any],
    *,
    files: list[InlineFile] | None = None,
) -> dict[str, Any]:
    """Les IA du mode, dans l'ordre. Lève AiUnavailableError si aucune ne répond."""
    chain = _chain(settings, bool(files))
    for index, provider in enumerate(chain):
        try:
            if provider == "local":
                local_settings = settings if index == 0 else _as_backup(settings)
                return local_ai.generate_json(local_settings, system_prompt, payload, files=files)
            if provider == "gemini":
                return gemini.generate_json(settings, system_prompt, payload, files=files)
            return openai_compat.generate_json(settings, provider, system_prompt, payload)
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
