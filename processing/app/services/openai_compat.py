"""Groq et DeepSeek : deux API au format « chat completions » d'OpenAI, appelées de la même façon.

Même contrat que `gemini.generate_json` : le JSON du modèle, ou `AiUnavailableError` (clé absente,
quota atteint sur toutes les clés, réseau coupé, réponse illisible). Les clés tournent toutes seules
quand l'une atteint son quota (voir `key_pool`). On n'appelle pas ce module directement : passer par
`providers`. Ni Groq ni DeepSeek ne lisent ici les images ou le son : `providers` les saute quand
un fichier est joint.
"""

import json
import logging
import time
from typing import Any

import httpx

from app.core.config import Settings
from app.services import key_pool
from app.services.connect_retry import call_with_connect_retry
from app.services.llm_common import AiUnavailableError, extract_json

logger = logging.getLogger(__name__)


def _model(settings: Settings, provider: str) -> str:
    return settings.groq_model if provider == "groq" else settings.deepseek_model


def generate_json(
    settings: Settings,
    provider: str,
    system_prompt: str,
    payload: dict[str, Any],
    *,
    transport: httpx.BaseTransport | None = None,
) -> dict[str, Any]:
    keys = settings.keys_for(provider)
    if settings.demo_offline or not keys:
        raise AiUnavailableError("offline or not configured")
    body = {
        "model": _model(settings, provider),
        "temperature": 0.3,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
        ],
    }
    started = time.monotonic()
    deadline = started + settings.ai_timeout_seconds

    def call(key: str) -> dict[str, Any]:
        remaining = deadline - time.monotonic()
        if remaining < 1:
            raise AiUnavailableError("timeout")
        with httpx.Client(transport=transport) as client:
            response = call_with_connect_retry(
                lambda: client.post(
                    f"{settings.base_url_for(provider)}/chat/completions",
                    json=body,
                    headers={"authorization": f"Bearer {key}"},
                    timeout=deadline - time.monotonic(),
                ),
                deadline=deadline,
            )
        response.raise_for_status()
        data = response.json()
        if not isinstance(data, dict):
            raise ValueError("unexpected response")
        return data

    try:
        data = key_pool.call_with_rotation(provider, keys, settings, call)
        result = extract_json(data["choices"][0]["message"]["content"])
    except AiUnavailableError:
        raise
    except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError, AttributeError) as exc:
        logger.warning("%s : génération impossible (%s)", provider, type(exc).__name__)
        raise AiUnavailableError(type(exc).__name__) from exc
    logger.info("%s : réponse en %d ms", provider, int((time.monotonic() - started) * 1000))
    return result
