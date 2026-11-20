"""Contrat des routes d'IA, repris à la main côté web dans `src/server/processing.ts`."""

from typing import Any, Literal

from pydantic import BaseModel, Field


class PromptRequest(BaseModel):
    payload: dict[str, Any] = Field(default_factory=dict)


class PromptResponse(BaseModel):
    result: dict[str, Any]
    source: Literal["gemini", "fallback"]


class EmbedRequest(BaseModel):
    texts: list[str] = Field(min_length=1, max_length=100)


class EmbedResponse(BaseModel):
    vectors: list[list[float]]
