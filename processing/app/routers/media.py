"""Examen d'un fichier importé : ce que l'image déclare sur elle-même (sans IA)."""

import base64
import binascii
from dataclasses import asdict

from fastapi import APIRouter

from app.core.errors import AppError
from app.schemas.media import MediaInspectRequest, MediaReportResponse
from app.services.media_inspect import inspect_image

router = APIRouter(prefix="/v1/media", tags=["media"])


@router.post("/inspect", operation_id="inspectMedia")
def inspect(body: MediaInspectRequest) -> MediaReportResponse:
    """Signature, appareil, date, Content Credentials : relevés, jamais jugés."""
    try:
        data = base64.b64decode(body.data, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise AppError("VALIDATION_FAILED", 422, "Le fichier envoyé est illisible.") from exc
    return MediaReportResponse(**asdict(inspect_image(data)))
