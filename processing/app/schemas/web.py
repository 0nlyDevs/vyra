"""Contrat de la recherche web, repris à la main côté web dans `src/server/processing.ts`."""

from typing import Literal

from pydantic import BaseModel, Field


class WebSourcesRequest(BaseModel):
    claim: str = Field(min_length=10, max_length=2000)


class WebArticleOut(BaseModel):
    url: str
    title: str
    site: str
    # Date ISO de publication (moteur ou page lue) ; None si elle reste inconnue.
    published_at: str | None
    excerpt: str
    language: str | None
    # Début du texte de la page et ses liens sortants : pour retrouver qui reprend qui.
    body: str = ""
    links: list[str] = Field(default_factory=list)


class NewsFeed(BaseModel):
    url: str = Field(min_length=8, max_length=500)
    name: str = Field(min_length=1, max_length=120)


class NewsFeedsRequest(BaseModel):
    feeds: list[NewsFeed] = Field(min_length=1, max_length=40)


class NewsItemOut(BaseModel):
    url: str
    title: str
    summary: str
    published_at: str | None
    source_name: str


class NewsFeedsResponse(BaseModel):
    items: list[NewsItemOut]
    # Nombre de flux qui ont répondu (0 : réseau coupé).
    feeds_read: int


class WebSourcesResponse(BaseModel):
    articles: list[WebArticleOut]
    # « fallback » : recherche impossible (hors ligne, GDELT indisponible).
    source: Literal["tavily", "gdelt", "fallback"]
