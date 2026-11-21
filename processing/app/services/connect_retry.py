"""Nouvel essai quand la connexion échoue avant même d'atteindre le serveur.

Dans le conteneur, la résolution des noms échoue parfois au hasard (« No address associated with
hostname ») : la requête n'est pas partie, on peut la relancer sans risque. Seule
`httpx.ConnectError` est retentée ici : un délai dépassé, un 429 ou une erreur 5xx restent
traités par chaque appelant (modèle suivant, réponse de secours).
"""

__all__ = ["CONNECT_ATTEMPTS", "call_with_connect_retry", "call_with_connect_retry_async"]

import asyncio
import logging
import time
from collections.abc import Awaitable, Callable

import httpx

logger = logging.getLogger(__name__)

CONNECT_ATTEMPTS = 4
# Pause avant le nouvel essai : 0,5 s après le premier échec, 1 s après le deuxième, etc.
RETRY_PAUSE_SECONDS = 0.5
# Une tentative qui n'aurait plus une seconde devant elle n'aboutirait pas.
MIN_ATTEMPT_SECONDS = 1.0


def _pause_before_retry(attempt: int, deadline: float | None) -> float | None:
    """La pause avant l'essai suivant, ou None s'il n'y a plus d'essai possible."""
    pause = RETRY_PAUSE_SECONDS * attempt
    if attempt >= CONNECT_ATTEMPTS:
        return None
    if deadline is not None and time.monotonic() + pause + MIN_ATTEMPT_SECONDS > deadline:
        return None
    logger.info("réseau : connexion impossible, essai %d sur %d", attempt + 1, CONNECT_ATTEMPTS)
    return pause


def call_with_connect_retry[T](send: Callable[[], T], *, deadline: float | None = None) -> T:
    """Appelle `send` jusqu'à `CONNECT_ATTEMPTS` fois tant que la connexion échoue.

    `deadline` (horloge `time.monotonic`) : aucun nouvel essai qui finirait après.
    """
    attempt = 1
    while True:
        try:
            return send()
        except httpx.ConnectError:
            pause = _pause_before_retry(attempt, deadline)
            if pause is None:
                raise
        time.sleep(pause)
        attempt += 1


async def call_with_connect_retry_async[T](send: Callable[[], Awaitable[T]]) -> T:
    """Comme `call_with_connect_retry`, pour les appels asynchrones (recherche web, flux)."""
    attempt = 1
    while True:
        try:
            return await send()
        except httpx.ConnectError:
            pause = _pause_before_retry(attempt, None)
            if pause is None:
                raise
        await asyncio.sleep(pause)
        attempt += 1
