"""Contrat de la route d'examen des fichiers, repris côté web dans `src/server/processing.ts`."""

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from app.schemas.ai import MAX_BASE64_LENGTH


class _CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class MediaInspectRequest(_CamelModel):
    mime_type: str = Field(pattern=r"^image/[a-z0-9.+-]+$")
    data: str = Field(min_length=1, max_length=MAX_BASE64_LENGTH)


class MediaReportResponse(_CamelModel):
    format: str
    ai_signature: bool
    generator: str | None
    # Nom fixé à la main : la conversion automatique donnerait « c2Pa ».
    c2pa: bool = Field(alias="c2pa")
    ai_source_type: bool
    stripped: bool
    taken_at: str | None
    camera: str | None
    software: str | None
    gps: bool
    findings: list[str]


class SafeCopyResponse(_CamelModel):
    mime_type: str
    data: str
    width: int
    height: int
    faces_blurred: int
    metadata_removed: bool
    first_frame_only: bool


class VideoInspectRequest(_CamelModel):
    mime_type: str = Field(pattern=r"^video/[a-z0-9.+-]+$")
    data: str = Field(min_length=1, max_length=MAX_BASE64_LENGTH)


class VideoFrame(_CamelModel):
    second: float
    mime_type: str
    data: str
    faces_blurred: int


class VideoAudio(_CamelModel):
    mime_type: str
    data: str
    seconds: float


class VideoReportResponse(_CamelModel):
    report: MediaReportResponse
    duration: float
    width: int | None
    height: int | None
    frames: list[VideoFrame]
    audio: VideoAudio | None
