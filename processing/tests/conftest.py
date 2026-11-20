"""Clients de test : aucune variable d'environnement ni fichier .env n'est lu."""

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


def make_settings(**overrides: object) -> Settings:
    return Settings(_env_file=None, **overrides)


@pytest.fixture
def offline_client() -> TestClient:
    return TestClient(create_app(make_settings(demo_offline=True)), raise_server_exceptions=False)
