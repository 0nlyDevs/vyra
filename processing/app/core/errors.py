"""Format d'erreur unique du service : `{"error": {"code": ..., "message": ...}}`.

Les codes reprennent ceux du catalogue de web (`web/src/lib/errors.ts`) quand ils existent.
Les messages sont en français et ne contiennent jamais de détail technique.
"""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

logger = logging.getLogger(__name__)

_HTTP_ERRORS: dict[int, tuple[str, str]] = {
    401: ("UNAUTHORIZED", "Accès refusé."),
    403: ("FORBIDDEN", "Accès refusé."),
    404: ("NOT_FOUND", "Ressource introuvable."),
    405: ("METHOD_NOT_ALLOWED", "Méthode non autorisée."),
}


class AppError(Exception):
    """Erreur prévue, levée par un service ou une dépendance, renvoyée telle quelle au client."""

    def __init__(self, code: str, status_code: int, message: str) -> None:
        super().__init__(code)
        self.code = code
        self.status_code = status_code
        self.message = message


def error_response(status_code: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code, content={"error": {"code": code, "message": message}}
    )


async def _handle_app_error(_request: Request, exc: AppError) -> JSONResponse:
    return error_response(exc.status_code, exc.code, exc.message)


async def _handle_http_error(_request: Request, exc: HTTPException) -> JSONResponse:
    code, message = _HTTP_ERRORS.get(exc.status_code, ("HTTP_ERROR", "Requête refusée."))
    return error_response(exc.status_code, code, message)


async def _handle_validation_error(_request: Request, _exc: RequestValidationError) -> JSONResponse:
    # Le détail de validation peut recopier les données reçues : on ne le renvoie pas.
    return error_response(422, "VALIDATION_FAILED", "Les données envoyées sont invalides.")


async def _handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
    # Chemin sans la chaîne de requête, qui peut contenir des données.
    logger.error("Unhandled error on %s %s", request.method, request.url.path, exc_info=exc)
    return error_response(500, "INTERNAL", "Une erreur inattendue est survenue.")


def register_error_handlers(application: FastAPI) -> None:
    application.add_exception_handler(AppError, _handle_app_error)
    application.add_exception_handler(HTTPException, _handle_http_error)
    application.add_exception_handler(RequestValidationError, _handle_validation_error)
    application.add_exception_handler(Exception, _handle_unexpected_error)
