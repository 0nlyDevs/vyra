"""Ce qui est commun aux fournisseurs d'IA (Gemini, modèle local)."""

import json
from typing import Any


class AiUnavailableError(Exception):
    """L'IA n'a pas pu répondre (non configurée, hors ligne, réponse inutilisable)."""


def extract_json(content: str) -> dict[str, Any]:
    """Objet JSON de la réponse, même entouré de ```json ou de texte."""
    start, end = content.find("{"), content.rfind("}")
    if start == -1 or end <= start:
        raise ValueError("no JSON object")
    parsed = json.loads(content[start : end + 1])
    if not isinstance(parsed, dict):
        raise ValueError("JSON is not an object")
    return parsed
