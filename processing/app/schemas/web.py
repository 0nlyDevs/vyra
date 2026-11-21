"""Contrat de la recherche web, repris à la main côté web dans `src/server/processing.ts`."""

from typing import Literal

from pydantic import BaseModel, Field


class WebSourcesRequest(BaseModel):
    claim: str = Field(min_length=10, max_length=2000)


class WebArticleOut(BaseModel):
    url: str
    title: str
    site: str
    # Date ISO de publication (page lue), ou à défaut celle où GDELT a vu l'article.
    published_at: str | None
    excerpt: str
    language: str | None


class WebSourcesResponse(BaseModel):
    articles: list[WebArticleOut]
    # « fallback » : recherche impossible (hors ligne, GDELT indisponible).
    source: Literal["gdelt", "fallback"]
