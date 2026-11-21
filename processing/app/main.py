"""Création de l'application FastAPI : routeurs et gestion d'erreurs. Rien d'autre.

Le port n'est ouvert que sur 127.0.0.1 côté PC (docker-compose.yml) : seul le serveur
Next.js du même PC l'appelle, d'où l'absence de clé interne.
"""

from fastapi import FastAPI

from app.core.config import Settings, get_settings
from app.core.errors import register_error_handlers
from app.core.logging import configure_logging
from app.routers import ai, health, media


def create_app(settings: Settings | None = None) -> FastAPI:
    """Construit l'application. `settings` sert aux tests ; sinon lus dans l'environnement."""
    configure_logging()
    settings = settings or get_settings()
    application = FastAPI(
        title="MindStack Processing",
        summary="IA et traitements Python, appelés uniquement par le serveur Next.js.",
        version="0.1.0",
    )
    # Toute dépendance `get_settings` de l'application renvoie les réglages reçus ici.
    application.dependency_overrides[get_settings] = lambda: settings
    register_error_handlers(application)

    application.include_router(health.router)
    # Tout nouveau routeur s'ajoute ici.
    application.include_router(ai.router)
    application.include_router(media.router)
    return application


app = create_app()
