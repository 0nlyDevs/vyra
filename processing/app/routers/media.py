"""Examen d'un fichier importé : ce que l'image déclare sur elle-même (sans IA)."""

import base64
import binascii
from dataclasses import asdict

from fastapi import APIRouter

from app.core.errors import AppError
from app.schemas.media import MediaInspectRequest, MediaReportResponse, SafeCopyResponse
from app.services.media_inspect import inspect_image
from app.services.safe_copy import UnreadableImageError, make_safe_copy

router = APIRouter(prefix="/v1/media", tags=["media"])


@router.post("/inspect", operation_id="inspectMedia")
def inspect(body: MediaInspectRequest) -> MediaReportResponse:
    """Signature, appareil, date, Content Credentials : relevés, jamais jugés."""
    return MediaReportResponse(**asdict(inspect_image(_decode(body.data))))


@router.post("/safe-copy", operation_id="makeSafeCopy")
def safe_copy(body: MediaInspectRequest) -> SafeCopyResponse:
    """Copie à envoyer à la place de l'original : visages floutés, informations cachées retirées."""
    try:
        copy = make_safe_copy(_decode(body.data))
    except UnreadableImageError as exc:
        raise AppError("FILE_NOT_SUPPORTED", 422, "Cette image ne se lit pas.") from exc
    return SafeCopyResponse(
        mime_type="image/jpeg",
        data=base64.b64encode(copy.data).decode("ascii"),
        width=copy.width,
        height=copy.height,
        faces_blurred=copy.faces_blurred,
        metadata_removed=copy.metadata_removed,
        first_frame_only=copy.first_frame_only,
    )


def _decode(data: str) -> bytes:
    try:
        return base64.b64decode(data, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise AppError("VALIDATION_FAILED", 422, "Le fichier envoyé est illisible.") from exc
