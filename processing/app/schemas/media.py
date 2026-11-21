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
