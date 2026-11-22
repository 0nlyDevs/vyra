"""Contrat des routes d'IA, repris à la main côté web dans `src/server/processing.ts`."""

import json
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

# Un fichier joint fait au plus 8 Mo : environ 11 millions de caractères en base64.
MAX_BASE64_LENGTH = 11_500_000
VARIANT_PATTERN = r"^[a-z0-9][a-z0-9-]{0,40}$"
# Le texte envoyé à un modèle est borné : une requête énorme coûte des jetons et du temps à tout
# le monde.
MAX_PAYLOAD_CHARS = 200_000


class InlineFile(BaseModel):
    """Image ou son joint à un prompt, en base64."""

    model_config = ConfigDict(populate_by_name=True)

    mime_type: str = Field(alias="mimeType", pattern=r"^(image|audio)/[a-z0-9.+-]+$")
    data: str = Field(min_length=1, max_length=MAX_BASE64_LENGTH)


class PromptRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    payload: dict[str, Any] = Field(default_factory=dict)

    @field_validator("payload")
    @classmethod
    def _payload_is_bounded(cls, value: dict[str, Any]) -> dict[str, Any]:
        if len(json.dumps(value, ensure_ascii=False)) > MAX_PAYLOAD_CHARS:
            raise ValueError("payload trop volumineux")
        return value

    # Jusqu'à 4 : les images clés d'une vidéo (scan vidéo, prompt `read-video`).
    files: list[InlineFile] = Field(default_factory=list, max_length=4)
    # Réponse de secours propre à un cas de démo : `fallbacks/<nom>--<variante>.json`.
    fallback_variant: str | None = Field(
        default=None, alias="fallbackVariant", pattern=VARIANT_PATTERN
    )


class PromptResponse(BaseModel):
    result: dict[str, Any]
    source: Literal["gemini", "fallback"]


class EmbedRequest(BaseModel):
    texts: list[str] = Field(min_length=1, max_length=100)


class EmbedResponse(BaseModel):
    vectors: list[list[float]]
