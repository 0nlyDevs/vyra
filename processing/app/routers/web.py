"""Recherche web : les articles de presse qui rapportent une information."""

from fastapi import APIRouter

from app.core.config import SettingsDep
from app.schemas.web import WebArticleOut, WebSourcesRequest, WebSourcesResponse
from app.services.ai_service import load_fallback
from app.services.web_search import WebSearchUnavailableError, find_articles

router = APIRouter(prefix="/v1", tags=["web"])


@router.post("/web-sources", operation_id="findWebSources")
async def find_web_sources(body: WebSourcesRequest, settings: SettingsDep) -> WebSourcesResponse:
    """Articles proches de `claim` (GDELT), lus et datés. Hors ligne : réponse de secours."""
    try:
        articles = await find_articles(settings, body.claim)
    except WebSearchUnavailableError:
        fallback = load_fallback("web-sources") or {}
        items = fallback.get("articles", [])
        return WebSourcesResponse(
            articles=[WebArticleOut.model_validate(item) for item in items], source="fallback"
        )
    return WebSourcesResponse(
        articles=[WebArticleOut.model_validate(article.as_dict()) for article in articles],
        source="gdelt",
    )
