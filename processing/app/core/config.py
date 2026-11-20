"""Réglages du service, lus depuis l'environnement (ou `processing/.env`).

Seul fichier autorisé à lire l'environnement. Les autres modules reçoivent les réglages
par la dépendance `get_settings` (voir `SettingsDep`), jamais par `os.environ`.
"""

from functools import cache
from pathlib import Path
from typing import Annotated

from fastapi import Depends
from pydantic import SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

PROCESSING_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=PROCESSING_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        # Une erreur de validation ne doit jamais recopier une clé dans les logs.
        hide_input_in_errors=True,
    )

    # Clé de l'API Gemini (https://aistudio.google.com/apikey). Absente : réponses de secours.
    gemini_api_key: SecretStr | None = None
    # Alias tenu à jour par Google : pointe toujours vers le dernier modèle Flash.
    gemini_model: str = "gemini-flash-latest"
    gemini_embedding_model: str = "gemini-embedding-001"
    # Doit rester égal à la taille de la colonne `vector` du schéma web (src/server/db/schema.ts).
    embedding_dimensions: int = 768
    # Sous les 30 s : la personne attend la réponse à l'écran, devant le jury.
    ai_timeout_seconds: float = 20.0
    # true : jamais d'appel à Gemini, toujours les réponses de secours (répétition du plan B).
    demo_offline: bool = False

    @field_validator("gemini_api_key", mode="before")
    @classmethod
    def _empty_as_missing(cls, value: object) -> object:
        # Une variable déclarée mais vide vaut « non configurée ».
        return None if value == "" else value


@cache
def get_settings() -> Settings:
    """Lit l'environnement une seule fois, au premier appel."""
    return Settings()


SettingsDep = Annotated[Settings, Depends(get_settings)]
