"""Réglages du service, lus depuis l'environnement (ou `processing/.env`).

Seul fichier autorisé à lire l'environnement. Les autres modules reçoivent les réglages
par la dépendance `get_settings` (voir `SettingsDep`), jamais par `os.environ`.
"""

from functools import cache
from pathlib import Path
from typing import Annotated, Literal

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

    # Fournisseur de l'IA. « gemini » : API gratuite de Google, rien à installer (par défaut).
    # « local » : modèle libre sur le PC avec Ollama (Gemma 4), sans wifi : pour la démo.
    ai_provider: Literal["gemini", "local"] = "gemini"

    # Clé de l'API Gemini (https://aistudio.google.com/apikey). Absente : réponses de secours.
    gemini_api_key: SecretStr | None = None
    # Modèle principal. Mesuré le 21/11 : réponse en 2 à 3 secondes, quand « gemini-flash-latest »
    # (le dernier Flash) était saturé.
    gemini_model: str = "gemini-3-flash-preview"
    # Essayés dans l'ordre quand le modèle précédent est saturé, trop lent ou retiré, dans la
    # limite de `ai_timeout_seconds` au total.
    gemini_fallback_models: list[str] = ["gemini-flash-latest", "gemini-3.1-flash-lite"]
    # Temps laissé à chaque modèle avant de passer au suivant (un modèle saturé peut ne rien dire).
    gemini_attempt_timeout_seconds: float = 8.0
    gemini_embedding_model: str = "gemini-embedding-001"
    # Doit rester égal à la taille de la colonne `vector` du schéma web (src/server/db/schema.ts).
    embedding_dimensions: int = 768
    # Sous les 30 s : la personne attend la réponse à l'écran, devant le jury.
    ai_timeout_seconds: float = 20.0

    # IA locale : serveur compatible OpenAI (Ollama). Depuis Docker, le PC s'appelle
    # host.docker.internal ; processing lancé hors Docker : http://127.0.0.1:11434/v1.
    local_ai_url: str = "http://host.docker.internal:11434/v1"
    # Gemma 4 E4B lit le texte, les images et le son (environ 10 Go à télécharger).
    local_ai_model: str = "gemma4:e4b"
    # 768 dimensions, comme la colonne `vector` de la base.
    local_embedding_model: str = "embeddinggemma"
    # Plus long qu'avec Gemini : le premier appel charge le modèle en mémoire.
    local_ai_timeout_seconds: float = 60.0
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
