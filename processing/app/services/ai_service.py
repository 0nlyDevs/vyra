"""Exécution d'un prompt : Gemini d'abord, réponse de secours ensuite.

Ajouter un prompt = deux fichiers, rien d'autre :
- `app/prompts/<nom>.md` : la consigne donnée au modèle (format JSON attendu compris) ;
- `app/fallbacks/<nom>.json` : la réponse montrée si Gemini ne répond pas (wifi coupé…).

Facultatif : `app/fallbacks/<nom>--<variante>.json`, une réponse de secours propre à un cas de
démo (une affaire, un fichier). Le web la demande avec `fallback_variant` ; sans fichier pour
cette variante, la réponse de secours générale s'applique.
"""

import json
import logging
import re
from functools import cache
from pathlib import Path
from typing import Any, Literal

from app.core.config import Settings
from app.schemas.ai import InlineFile
from app.services import providers
from app.services.llm_common import AiUnavailableError

logger = logging.getLogger(__name__)

APP_DIR = Path(__file__).resolve().parents[1]
PROMPTS_DIR = APP_DIR / "prompts"
FALLBACKS_DIR = APP_DIR / "fallbacks"
PROMPT_NAME = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")

AiSource = Literal["gemini", "fallback"]


class UnknownPromptError(Exception):
    """Aucun fichier `app/prompts/<nom>.md` pour ce nom."""


def _file(directory: Path, name: str, suffix: str) -> Path:
    # Le nom vient de l'URL : on refuse tout ce qui n'est pas un simple nom de fichier.
    if not PROMPT_NAME.match(name):
        raise UnknownPromptError(name)
    return directory / f"{name}{suffix}"


@cache
def load_prompt(name: str) -> str:
    path = _file(PROMPTS_DIR, name, ".md")
    if not path.is_file():
        raise UnknownPromptError(name)
    return path.read_text(encoding="utf-8")


def load_fallback(name: str) -> dict[str, Any] | None:
    path = _file(FALLBACKS_DIR, name, ".json")
    if not path.is_file():
        return None
    data = json.loads(path.read_text(encoding="utf-8"))
    return data if isinstance(data, dict) else None


def run_prompt(
    settings: Settings,
    name: str,
    payload: dict[str, Any],
    *,
    files: list[InlineFile] | None = None,
    fallback_variant: str | None = None,
) -> tuple[dict[str, Any], AiSource]:
    """Résultat du prompt `name` et sa provenance ; lève AiUnavailableError sans secours."""
    system_prompt = load_prompt(name)
    try:
        # « gemini » désigne une réponse produite par un modèle, Gemini ou local.
        return providers.generate_json(settings, system_prompt, payload, files=files), "gemini"
    except AiUnavailableError:
        fallback = load_fallback(f"{name}--{fallback_variant}") if fallback_variant else None
        fallback = fallback or load_fallback(name)
        if fallback is None:
            raise
        logger.info("ia : réponse de secours pour %s", name)
        return fallback, "fallback"
