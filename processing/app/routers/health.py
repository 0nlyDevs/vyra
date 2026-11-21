"""Santé du service : indique aussi quelle IA répond (utile avant de monter sur scène)."""

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.config import SettingsDep

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: str
    service: str
    ai: str


@router.get("/health", operation_id="getHealth")
def get_health(settings: SettingsDep) -> HealthResponse:
    """« ok » si le service tourne ; `ai` vaut gemini, local, offline ou not-configured."""
    if settings.demo_offline:
        ai = "offline"
    elif settings.ai_provider == "local":
        ai = "local"
    elif settings.gemini_api_key is None:
        ai = "not-configured"
    else:
        ai = "gemini"
    return HealthResponse(status="ok", service="mindstack-processing", ai=ai)
