"""Exécution d'un prompt : Gemini d'abord, réponse de secours ensuite.

Ajouter un prompt = deux fichiers, rien d'autre :
- `app/prompts/<nom>.md` : la consigne donnée au modèle (format JSON attendu compris) ;
- `app/fallbacks/<nom>.json` : la réponse montrée si Gemini ne répond pas (wifi coupé…).
"""

import json
import logging
import re
from functools import cache
from pathlib import Path
from typing import Any, Literal

from app.core.config import Settings
from app.services import gemini
from app.services.gemini import AiUnavailableError

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
    settings: Settings, name: str, payload: dict[str, Any]
) -> tuple[dict[str, Any], AiSource]:
    """Résultat du prompt `name` et sa provenance ; lève AiUnavailableError sans secours."""
    system_prompt = load_prompt(name)
    try:
        return gemini.generate_json(settings, system_prompt, payload), "gemini"
    except AiUnavailableError:
        fallback = load_fallback(name)
        if fallback is None:
            raise
        logger.info("ia : réponse de secours pour %s", name)
        return fallback, "fallback"
