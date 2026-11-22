"""Création de l'application FastAPI : routeurs et gestion d'erreurs. Rien d'autre.

Sur le PC, le port n'est ouvert que sur 127.0.0.1 (docker-compose.yml). En ligne, le service
est public : PROCESSING_TOKEN réserve alors les routes au serveur Next.js (/health reste ouvert).
"""

from secrets import compare_digest
from typing import Annotated

from fastapi import Depends, FastAPI, Header

from app.core.config import Settings, SettingsDep, get_settings
from app.core.errors import AppError, register_error_handlers
from app.core.logging import configure_logging
from app.routers import ai, feed, health, media, voice, web


def require_token(
    settings: SettingsDep,
    x_processing_token: Annotated[str | None, Header()] = None,
) -> None:
    expected = settings.processing_token
    if expected is None:
        return
    received = (x_processing_token or "").encode()
    if not compare_digest(received, expected.get_secret_value().encode()):
        raise AppError("UNAUTHORIZED", 401, "Accès réservé au serveur web.")


def create_app(settings: Settings | None = None) -> FastAPI:
    """Construit l'application. `settings` sert aux tests ; sinon lus dans l'environnement."""
    configure_logging()
    settings = settings or get_settings()
    application = FastAPI(
        title="Vyra Processing",
        summary="IA et traitements Python, appelés uniquement par le serveur Next.js.",
        version="0.1.0",
        # En ligne (secret configuré), pas de documentation publique : elle listerait chaque route.
        openapi_url=None if settings.processing_token else "/openapi.json",
    )
    # Toute dépendance `get_settings` de l'application renvoie les réglages reçus ici.
    application.dependency_overrides[get_settings] = lambda: settings
    register_error_handlers(application)

    application.include_router(health.router)
    # Tout nouveau routeur s'ajoute ici, avec le contrôle du secret partagé.
    protected = [Depends(require_token)]
    application.include_router(ai.router, dependencies=protected)
    application.include_router(media.router, dependencies=protected)
    application.include_router(web.router, dependencies=protected)
    application.include_router(feed.router, dependencies=protected)
    application.include_router(voice.router, dependencies=protected)
    return application


app = create_app()
