"""Recherche web : les articles qui rapportent une information, et l'index de presse (RSS)."""

from fastapi import APIRouter

from app.core.config import SettingsDep
from app.schemas.web import (
    NewsFeedsRequest,
    NewsFeedsResponse,
    NewsItemOut,
    PagesRequest,
    PagesResponse,
    WebArticleOut,
    WebSourcesRequest,
    WebSourcesResponse,
)
from app.services.ai_service import load_fallback
from app.services.news_feeds import read_feeds
from app.services.web_search import WebSearchUnavailableError, find_articles, read_pages

router = APIRouter(prefix="/v1", tags=["web"])


@router.post("/web-sources", operation_id="findWebSources")
async def find_web_sources(body: WebSourcesRequest, settings: SettingsDep) -> WebSourcesResponse:
    """Articles proches de `claim` (Tavily, sinon GDELT), datés. Hors ligne : réponse de secours."""
    try:
        articles, engine = await find_articles(settings, body.claim, body.queries)
    except WebSearchUnavailableError:
        fallback = load_fallback("web-sources") or {}
        items = fallback.get("articles", [])
        return WebSourcesResponse(
            articles=[WebArticleOut.model_validate(item) for item in items], source="fallback"
        )
    return WebSourcesResponse(
        articles=[WebArticleOut.model_validate(article.as_dict()) for article in articles],
        source="tavily" if engine == "tavily" else "gdelt",
    )


@router.post("/pages", operation_id="readPages")
async def read_web_pages(body: PagesRequest, settings: SettingsDep) -> PagesResponse:
    """Titre, date, texte et liens des pages données. Hors ligne : aucune page."""
    try:
        articles = await read_pages(settings, body.urls)
    except WebSearchUnavailableError:
        return PagesResponse(articles=[])
    return PagesResponse(
        articles=[WebArticleOut.model_validate(article.as_dict()) for article in articles]
    )


@router.post("/news-feeds", operation_id="readNewsFeeds")
async def read_news_feeds(body: NewsFeedsRequest, settings: SettingsDep) -> NewsFeedsResponse:
    """Derniers articles des flux RSS demandés. Hors ligne : aucun article."""
    if settings.demo_offline:
        return NewsFeedsResponse(items=[], feeds_read=0)
    items, read = await read_feeds([(feed.url, feed.name) for feed in body.feeds])
    return NewsFeedsResponse(
        items=[NewsItemOut.model_validate(item.as_dict()) for item in items], feeds_read=read
    )
