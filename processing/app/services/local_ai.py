"""Modèle d'IA local (Ollama sur le PC), par son API compatible OpenAI.

Sert pour la démo : aucune dépendance au wifi. Modèle par défaut : Gemma 4 E4B (texte, image et
son) et EmbeddingGemma pour les vecteurs. Toute panne lève `AiUnavailableError` : la réponse de
secours prend le relais, comme avec Gemini.
"""

import json
import logging
import math
import time
from typing import Any

import httpx

from app.core.config import Settings
from app.schemas.ai import InlineFile
from app.services.llm_common import AiUnavailableError, extract_json

logger = logging.getLogger(__name__)

# EmbeddingGemma donne de meilleurs vecteurs avec une consigne de tâche devant le texte.
EMBEDDING_PREFIXES = {"embeddinggemma": "task: sentence similarity | query: "}


def _url(settings: Settings, path: str) -> str:
    return f"{settings.local_ai_url.rstrip('/')}/{path}"


def _post(
    settings: Settings, path: str, body: dict[str, Any], transport: httpx.BaseTransport | None
) -> dict[str, Any]:
    if settings.demo_offline:
        raise AiUnavailableError("offline")
    timeout = settings.local_ai_timeout_seconds
    with httpx.Client(timeout=timeout, transport=transport) as client:
        response = client.post(_url(settings, path), json=body)
    response.raise_for_status()
    data = response.json()
    if not isinstance(data, dict):
        raise ValueError("unexpected response")
    return data


def _audio_format(mime_type: str) -> str:
    subtype = mime_type.split("/", 1)[1]
    return {"mpeg": "mp3", "x-wav": "wav", "wave": "wav", "x-m4a": "m4a"}.get(subtype, subtype)


def _file_part(file: InlineFile) -> dict[str, Any]:
    if file.mime_type.startswith("image/"):
        url = f"data:{file.mime_type};base64,{file.data}"
        return {"type": "image_url", "image_url": {"url": url}}
    audio = {"data": file.data, "format": _audio_format(file.mime_type)}
    return {"type": "input_audio", "input_audio": audio}


def generate_json(
    settings: Settings,
    system_prompt: str,
    payload: dict[str, Any],
    *,
    files: list[InlineFile] | None = None,
    transport: httpx.BaseTransport | None = None,
) -> dict[str, Any]:
    """Envoie la consigne, les données et d'éventuels fichiers ; renvoie le JSON du modèle."""
    content: list[dict[str, Any]] = [
        {"type": "text", "text": json.dumps(payload, ensure_ascii=False)}
    ]
    content += [_file_part(file) for file in files or []]
    body = {
        "model": settings.local_ai_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": content},
        ],
        "temperature": 0.3,
        "response_format": {"type": "json_object"},
        "stream": False,
    }
    started = time.monotonic()
    try:
        data = _post(settings, "chat/completions", body, transport)
        result = extract_json(data["choices"][0]["message"]["content"])
    except AiUnavailableError:
        raise
    except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError, AttributeError) as exc:
        logger.warning("ia locale : génération impossible (%s)", type(exc).__name__)
        raise AiUnavailableError(type(exc).__name__) from exc
    logger.info("ia locale : réponse en %d ms", int((time.monotonic() - started) * 1000))
    return result


def _fit(vector: list[float], dimensions: int) -> list[float]:
    """Ramène le vecteur à la taille de la colonne de la base, puis le normalise."""
    if len(vector) < dimensions:
        raise ValueError("vector too small")
    kept = vector[:dimensions]
    norm = math.sqrt(sum(value * value for value in kept)) or 1.0
    return [value / norm for value in kept]


def embed_texts(
    settings: Settings, texts: list[str], *, transport: httpx.BaseTransport | None = None
) -> list[list[float]]:
    """Un vecteur par texte, de taille `embedding_dimensions`."""
    model = settings.local_embedding_model
    prefix = next((p for key, p in EMBEDDING_PREFIXES.items() if key in model), "")
    body = {"model": model, "input": [prefix + text for text in texts]}
    try:
        data = _post(settings, "embeddings", body, transport)
        items = sorted(data["data"], key=lambda item: item["index"])
        vectors = [
            _fit(list(map(float, item["embedding"])), settings.embedding_dimensions)
            for item in items
        ]
    except AiUnavailableError:
        raise
    except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as exc:
        logger.warning("ia locale : vecteurs impossibles (%s)", type(exc).__name__)
        raise AiUnavailableError(type(exc).__name__) from exc
    if len(vectors) != len(texts):
        raise AiUnavailableError("wrong vector count")
    return vectors
