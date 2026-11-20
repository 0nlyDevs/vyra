"""Appels à l'API Gemini (REST, sans SDK) : le seul endroit du dépôt qui parle à Google.

Toute panne (clé absente, réseau coupé, délai dépassé, réponse illisible) lève
`AiUnavailableError` ; `ai_service` bascule alors sur les réponses de secours.
"""

import json
import logging
import time
from typing import Any

import httpx

from app.core.config import Settings

logger = logging.getLogger(__name__)

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models"


class AiUnavailableError(Exception):
    """L'IA n'a pas pu répondre (non configurée, hors ligne, réponse inutilisable)."""


def _api_key(settings: Settings) -> str:
    if settings.demo_offline or settings.gemini_api_key is None:
        raise AiUnavailableError("offline or not configured")
    return settings.gemini_api_key.get_secret_value()


def _extract_json(content: str) -> dict[str, Any]:
    """Objet JSON de la réponse, même entouré de ```json ou de texte."""
    start, end = content.find("{"), content.rfind("}")
    if start == -1 or end <= start:
        raise ValueError("no JSON object")
    parsed = json.loads(content[start : end + 1])
    if not isinstance(parsed, dict):
        raise ValueError("JSON is not an object")
    return parsed


def _post(
    settings: Settings, url: str, body: dict[str, Any], transport: httpx.BaseTransport | None
) -> dict[str, Any]:
    headers = {"x-goog-api-key": _api_key(settings)}
    with httpx.Client(timeout=settings.ai_timeout_seconds, transport=transport) as client:
        response = client.post(url, json=body, headers=headers)
    response.raise_for_status()
    data = response.json()
    if not isinstance(data, dict):
        raise ValueError("unexpected response")
    return data


def generate_json(
    settings: Settings,
    system_prompt: str,
    payload: dict[str, Any],
    *,
    transport: httpx.BaseTransport | None = None,
) -> dict[str, Any]:
    """Envoie la consigne et les données ; renvoie l'objet JSON produit par le modèle."""
    body = {
        "system_instruction": {"parts": [{"text": system_prompt}]},
        "contents": [
            {"role": "user", "parts": [{"text": json.dumps(payload, ensure_ascii=False)}]}
        ],
        "generationConfig": {"temperature": 0.3, "responseMimeType": "application/json"},
    }
    url = f"{GEMINI_URL}/{settings.gemini_model}:generateContent"
    started = time.monotonic()
    try:
        data = _post(settings, url, body, transport)
        parts = data["candidates"][0]["content"]["parts"]
        # Un modèle qui « réfléchit » peut renvoyer des parties de réflexion : on les saute.
        text = "".join(part.get("text", "") for part in parts if not part.get("thought"))
        result = _extract_json(text)
    except AiUnavailableError:
        raise
    except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError, AttributeError) as exc:
        logger.warning("gemini : génération impossible (%s)", type(exc).__name__)
        raise AiUnavailableError(type(exc).__name__) from exc
    logger.info("gemini : réponse en %d ms", int((time.monotonic() - started) * 1000))
    return result


def embed_texts(
    settings: Settings, texts: list[str], *, transport: httpx.BaseTransport | None = None
) -> list[list[float]]:
    """Un vecteur par texte, de taille `embedding_dimensions` (recherche par le sens)."""
    model = settings.gemini_embedding_model
    body = {
        "requests": [
            {
                "model": f"models/{model}",
                "content": {"parts": [{"text": text}]},
                "outputDimensionality": settings.embedding_dimensions,
            }
            for text in texts
        ]
    }
    url = f"{GEMINI_URL}/{model}:batchEmbedContents"
    try:
        data = _post(settings, url, body, transport)
        vectors = [list(map(float, item["values"])) for item in data["embeddings"]]
    except AiUnavailableError:
        raise
    except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as exc:
        logger.warning("gemini : vecteurs impossibles (%s)", type(exc).__name__)
        raise AiUnavailableError(type(exc).__name__) from exc
    if len(vectors) != len(texts):
        raise AiUnavailableError("wrong vector count")
    return vectors
