"""Contrat du fil d'actualité réel, repris à la main côté web dans `src/server/processing.ts`."""

from typing import Literal

from pydantic import BaseModel, Field


class LiveSourceIn(BaseModel):
    type: Literal["rss", "youtube", "mastodon", "google-trends", "facebook"]
    # Adresse du flux, ou texte cherché pour `facebook`.
    target: str = Field(min_length=3, max_length=500)
    name: str = Field(min_length=1, max_length=120)


class LiveFeedRequest(BaseModel):
    sources: list[LiveSourceIn] = Field(min_length=1, max_length=60)


class LiveItemOut(BaseModel):
    url: str
    text: str
    source_name: str
    title: str | None
    image_url: str | None
    # Date ISO de publication ; None quand la source ne la donne pas (Facebook).
    published_at: str | None
    author: str | None
    # Vues, partages ou recherches, selon la source.
    reach: int | None


class LiveFeedResponse(BaseModel):
    items: list[LiveItemOut]
    # Nombre de sources qui ont répondu (0 : réseau coupé).
    sources_read: int
