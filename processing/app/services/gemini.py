"""Appels à l'API Gemini (REST, sans SDK) : le seul endroit du dépôt qui parle à Google.

Toute panne (clé absente, réseau coupé, délai dépassé, réponse illisible) lève
`AiUnavailableError` ; `ai_service` bascule alors sur les réponses de secours.
On n'appelle pas ce module directement : passer par `providers`.
"""

__all__ = ["AiUnavailableError", "embed_texts", "generate_json"]

import json
import logging
import time
from typing import Any

import httpx

from app.core.config import Settings
from app.schemas.ai import InlineFile
from app.services.llm_common import AiUnavailableError, extract_json

logger = logging.getLogger(__name__)

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models"


def _api_key(settings: Settings) -> str:
    if settings.demo_offline or settings.gemini_api_key is None:
        raise AiUnavailableError("offline or not configured")
    return settings.gemini_api_key.get_secret_value()


def _post(
    settings: Settings,
    url: str,
    body: dict[str, Any],
    transport: httpx.BaseTransport | None,
    timeout: float | None = None,
) -> dict[str, Any]:
    # La clé part dans un en-tête, jamais dans l'adresse : elle n'apparaît pas dans les journaux.
    headers = {"x-goog-api-key": _api_key(settings)}
    with httpx.Client(
        timeout=timeout or settings.ai_timeout_seconds, transport=transport
    ) as client:
        response = client.post(url, json=body, headers=headers)
    response.raise_for_status()
    data = response.json()
    if not isinstance(data, dict):
        raise ValueError("unexpected response")
    return data


def _is_overloaded(exc: Exception) -> bool:
    """Le modèle est saturé, trop lent ou retiré : un autre modèle peut répondre.

    Une connexion impossible (pas de wifi) ou une clé refusée n'en font pas partie : les autres
    modèles échoueraient aussi.
    """
    if isinstance(exc, httpx.ReadTimeout):
        return True
    return isinstance(exc, httpx.HTTPStatusError) and (
        exc.response.status_code in (404, 429) or exc.response.status_code >= 500
    )


def generate_json(
    settings: Settings,
    system_prompt: str,
    payload: dict[str, Any],
    *,
    files: list[InlineFile] | None = None,
    transport: httpx.BaseTransport | None = None,
) -> dict[str, Any]:
    """Envoie la consigne, les données et d'éventuels fichiers ; renvoie le JSON du modèle."""
    parts: list[dict[str, Any]] = [{"text": json.dumps(payload, ensure_ascii=False)}]
    # Image ou son joint, en base64 : le modèle Flash lit les deux.
    parts += [{"inline_data": {"mime_type": f.mime_type, "data": f.data}} for f in files or []]
    body = {
        "system_instruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {"temperature": 0.3, "responseMimeType": "application/json"},
    }
    started = time.monotonic()
    models = [settings.gemini_model, *settings.gemini_fallback_models]
    for index, model in enumerate(models):
        remaining = settings.ai_timeout_seconds - (time.monotonic() - started)
        if remaining < 2:
            break
        last = index == len(models) - 1
        timeout = remaining if last else min(remaining, settings.gemini_attempt_timeout_seconds)
        try:
            url = f"{GEMINI_URL}/{model}:generateContent"
            data = _post(settings, url, body, transport, timeout=timeout)
            parts = data["candidates"][0]["content"]["parts"]
            # Un modèle qui « réfléchit » peut renvoyer des parties de réflexion : on les saute.
            text = "".join(part.get("text", "") for part in parts if not part.get("thought"))
            result = extract_json(text)
        except AiUnavailableError:
            raise
        except (
            httpx.HTTPError,
            KeyError,
            IndexError,
            TypeError,
            ValueError,
            AttributeError,
        ) as exc:
            if _is_overloaded(exc) and not last:
                logger.warning("gemini : %s saturé, essai du modèle suivant", model)
                continue
            logger.warning("gemini : génération impossible (%s)", type(exc).__name__)
            raise AiUnavailableError(type(exc).__name__) from exc
        elapsed = int((time.monotonic() - started) * 1000)
        logger.info("gemini : réponse de %s en %d ms", model, elapsed)
        return result
    raise AiUnavailableError("timeout")


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
