"""Rotation des clés d'API : quand une clé atteint son quota, la suivante prend le relais.

Chaque fournisseur a une ou plusieurs clés. Une clé qui répond « quota atteint » (429), « solde
épuisé » (402) ou « clé refusée » (401, 403) est mise de côté pour un temps, puis la clé suivante
est essayée. La clé qui a répondu en dernier est essayée la première : on ne repasse pas par les
clés épuisées à chaque appel. L'état vit en mémoire, dans ce processus.

Une clé n'apparaît jamais dans les journaux : seule une empreinte de quatre caractères y figure.
"""

import hashlib
import logging
import threading
import time
from collections.abc import Callable

import httpx

from app.core.config import Settings
from app.services.llm_common import AiUnavailableError

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_cooling: dict[tuple[str, str], float] = {}
_preferred: dict[str, int] = {}

# Réponses qui disent « cette clé ne peut plus servir pour l'instant » : on passe à la suivante.
_QUOTA_STATUSES = (402, 429)
_REFUSED_STATUSES = (401, 403)
_QUOTA_WORDS = ("quota", "billing", "insufficient", "balance", "per day", "daily", "exhausted")


def reset() -> None:
    """Oublie l'état (tests)."""
    with _lock:
        _cooling.clear()
        _preferred.clear()


def fingerprint(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()[:4]


def cooldown_for(exc: httpx.HTTPStatusError, settings: Settings) -> float | None:
    """Combien de temps mettre la clé de côté, ou None si l'erreur n'est pas une affaire de clé."""
    status = exc.response.status_code
    if status in _REFUSED_STATUSES:
        return settings.key_quota_cooldown_seconds
    if status not in _QUOTA_STATUSES:
        return None
    if status == 402 or any(word in exc.response.text.lower() for word in _QUOTA_WORDS):
        return settings.key_quota_cooldown_seconds
    retry_after = exc.response.headers.get("retry-after", "")
    if retry_after.replace(".", "", 1).isdigit():
        return min(max(float(retry_after), 1.0), settings.key_quota_cooldown_seconds)
    return settings.key_cooldown_seconds


def available_keys(provider: str, keys: list[str]) -> list[str]:
    """Les clés utilisables, la dernière qui a répondu d'abord."""
    if not keys:
        return []
    now = time.monotonic()
    with _lock:
        start = _preferred.get(provider, 0) % len(keys)
        ordered = keys[start:] + keys[:start]
        return [key for key in ordered if _cooling.get((provider, fingerprint(key)), 0.0) <= now]


def call_with_rotation[T](
    provider: str, keys: list[str], settings: Settings, call: Callable[[str], T]
) -> T:
    """Appelle `call(clé)` avec la première clé utilisable ; sur un quota atteint, la suivante.

    Les autres erreurs remontent telles quelles. Si toutes les clés sont épuisées, lève
    AiUnavailableError (ou, si la dernière réponse était un quota, cette erreur HTTP, pour que
    l'appelant puisse essayer un autre modèle).
    """
    candidates = available_keys(provider, keys)
    if not candidates:
        raise AiUnavailableError(f"{provider} : aucune clé disponible")
    last: httpx.HTTPStatusError | None = None
    for key in candidates:
        try:
            result = call(key)
        except httpx.HTTPStatusError as exc:
            seconds = cooldown_for(exc, settings)
            if seconds is None:
                raise
            with _lock:
                _cooling[(provider, fingerprint(key))] = time.monotonic() + seconds
            logger.warning(
                "%s : clé …%s hors quota (%d), mise de côté %d s, clé suivante",
                provider,
                fingerprint(key),
                exc.response.status_code,
                int(seconds),
            )
            last = exc
            continue
        with _lock:
            _preferred[provider] = keys.index(key)
        return result
    assert last is not None
    raise last
