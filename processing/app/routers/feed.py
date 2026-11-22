"""Fil d'actualité : les dernières publications réelles des sources choisies par le web."""

from fastapi import APIRouter

from app.core.config import SettingsDep
from app.schemas.feed import LiveFeedRequest, LiveFeedResponse, LiveItemOut
from app.services.live_feed import LiveSource, read_live_sources

router = APIRouter(prefix="/v1", tags=["feed"])


@router.post("/live-feed", operation_id="readLiveFeed")
async def read_live_feed(body: LiveFeedRequest, settings: SettingsDep) -> LiveFeedResponse:
    """Publications récentes des sources demandées. Hors ligne : aucune."""
    if settings.demo_offline:
        return LiveFeedResponse(items=[], sources_read=0)
    sources = [
        LiveSource(type=source.type, target=source.target, name=source.name)
        for source in body.sources
    ]
    items, read = await read_live_sources(sources, settings=settings)
    return LiveFeedResponse(
        items=[LiveItemOut.model_validate(item.as_dict()) for item in items], sources_read=read
    )
