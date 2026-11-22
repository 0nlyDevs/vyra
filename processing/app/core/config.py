"""Réglages du service, lus depuis l'environnement (ou `processing/.env`).

Seul fichier autorisé à lire l'environnement. Les autres modules reçoivent les réglages
par la dépendance `get_settings` (voir `SettingsDep`), jamais par `os.environ`.
"""

from functools import cache
from pathlib import Path
from typing import Annotated, Literal

from fastapi import Depends
from pydantic import SecretStr, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

PROCESSING_DIR = Path(__file__).resolve().parents[2]

# Les IA distantes que le service sait appeler, dans l'ordre par défaut. Un fournisseur sans clé est
# sauté ; le suivant prend le relais (voir `services/providers.py`).
REMOTE_PROVIDERS = ("groq", "gemini", "deepseek")

# Une liste donnée en une seule variable, séparée par des virgules : `GROQ_API_KEYS=cle1,cle2`.
CsvStrings = Annotated[list[str], NoDecode]
CsvSecrets = Annotated[list[SecretStr], NoDecode]


def _split_csv(value: object) -> object:
    if isinstance(value, str):
        return [part.strip() for part in value.split(",") if part.strip()]
    return value


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=PROCESSING_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        # Une erreur de validation ne doit jamais recopier une clé dans les logs.
        hide_input_in_errors=True,
    )

    # Mode de l'IA. Dans tous les modes, si aucune IA ne répond, la réponse préparée s'affiche.
    # - « gemini » (nom historique, par défaut) : fournisseurs distants de ai_providers.
    # - « gemini-then-local » : fournisseurs distants, puis modèle local déjà configuré.
    # - « local » : Gemma 4 en local seul, sans wifi.
    ai_mode: Literal["gemini", "gemini-then-local", "local"] = "gemini"

    # Quelles IA distantes interroger, et dans quel ordre : `AI_PROVIDERS=groq,gemini,deepseek`
    # (l'ordre par défaut). La première répond ; si elle est hors quota, sans clé ou en panne, la
    # suivante prend le relais. Le mode local (ci-dessus) passe toujours après.
    ai_providers: CsvStrings = list(REMOTE_PROVIDERS)

    # Clés des fournisseurs, une ou plusieurs séparées par des virgules : `GROQ_API_KEYS=cle1,cle2`.
    # Quand une clé atteint son quota (erreur 429), la suivante prend le relais toute seule ; la clé
    # épuisée est mise de côté le temps de se rétablir (`key_cooldown_seconds`).
    # Limites par projet (Gemini), par organisation (Groq) ou par compte (DeepSeek), pas par clé :
    # plusieurs clés d'un même projet ne donnent pas plus de quota.
    groq_api_keys: CsvSecrets = []
    gemini_api_keys: CsvSecrets = []
    deepseek_api_keys: CsvSecrets = []
    # Adresses des API (changer de région, passer par un proxy ou un serveur compatible).
    gemini_base_url: str = "https://generativelanguage.googleapis.com/v1beta/models"
    groq_base_url: str = "https://api.groq.com/openai/v1"
    deepseek_base_url: str = "https://api.deepseek.com"
    groq_model: str = "openai/gpt-oss-120b"
    deepseek_model: str = "deepseek-flash"
    # Mise de côté d'une clé : limite de débit (429 sans autre précision), puis quota du jour,
    # solde épuisé ou clé refusée (rétablissement long).
    key_cooldown_seconds: float = 60.0
    key_quota_cooldown_seconds: float = 3600.0

    # Clé de l'API Gemini (https://aistudio.google.com/apikey). Absente : réponses de secours.
    # Une seule clé (ancien réglage, toujours lu) ; plusieurs : `gemini_api_keys` ci-dessus.
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
    # Mode « gemini-then-local » : temps laissé à Gemma 4 après Gemini (le web attend 65 s en tout).
    local_ai_backup_timeout_seconds: float = 40.0

    # Clé de l'API Tavily (https://tavily.com) : recherche web. Absente : recherche GDELT.
    # Une seule clé (ancien réglage, toujours lu) ; plusieurs : `TAVILY_API_KEYS=cle1,cle2`.
    tavily_api_key: SecretStr | None = None
    tavily_api_keys: CsvSecrets = []
    # Clé Google Cloud avec l'API Fact Check Tools (gratuite) : les vérifications publiées dans le
    # monde. Absente : seulement les rubriques de vérification (par Tavily) et Wikipédia.
    # Plusieurs : `GOOGLE_FACTCHECK_API_KEYS=cle1,cle2`.
    google_factcheck_api_key: SecretStr | None = None
    google_factcheck_api_keys: CsvSecrets = []
    # Voix : la dictée passe par Groq Whisper (les clés Groq ci-dessus), la lecture à voix haute par
    # ElevenLabs (https://elevenlabs.io). Sans clé ElevenLabs, c'est la voix du navigateur qui lit.
    stt_model: str = "whisper-large-v3"
    elevenlabs_api_keys: CsvSecrets = []
    elevenlabs_base_url: str = "https://api.elevenlabs.io/v1"
    # « George » : une voix par défaut, utilisable avec un compte gratuit.
    elevenlabs_voice_id: str = "JBFqnCBsd6RMkjVDRZzb"
    elevenlabs_model: str = "eleven_flash_v2_5"
    # true : jamais d'appel à Gemini, toujours les réponses de secours (répétition du plan B).
    demo_offline: bool = False
    # Secret partagé avec le web (même valeur des deux côtés), exigé dans l'en-tête
    # X-Processing-Token. Obligatoire en ligne ; absent (sur le PC) : pas de contrôle.
    processing_token: SecretStr | None = None

    @field_validator(
        "ai_providers",
        "groq_api_keys",
        "gemini_api_keys",
        "deepseek_api_keys",
        "tavily_api_keys",
        "google_factcheck_api_keys",
        "elevenlabs_api_keys",
        mode="before",
    )
    @classmethod
    def _csv(cls, value: object) -> object:
        return _split_csv(value)

    @field_validator("gemini_base_url", "groq_base_url", "deepseek_base_url", "elevenlabs_base_url")
    @classmethod
    def _no_trailing_slash(cls, value: str) -> str:
        return value.strip().rstrip("/")

    @field_validator("ai_providers")
    @classmethod
    def _known_providers(cls, value: list[str]) -> list[str]:
        names = [name.lower() for name in value]
        unknown = [name for name in names if name not in REMOTE_PROVIDERS]
        if unknown:
            raise ValueError(
                f"fournisseur inconnu : {', '.join(unknown)} "
                f"(choix : {', '.join(REMOTE_PROVIDERS)})"
            )
        return list(dict.fromkeys(names))

    @field_validator(
        "gemini_api_key",
        "tavily_api_key",
        "google_factcheck_api_key",
        "processing_token",
        mode="before",
    )
    @classmethod
    def _empty_as_missing(cls, value: object) -> object:
        # Une variable déclarée mais vide vaut « non configurée ».
        return None if value == "" else value

    def base_url_for(self, provider: str) -> str:
        """L'adresse de l'API d'un fournisseur (sans « / » final)."""
        return {
            "groq": self.groq_base_url,
            "gemini": self.gemini_base_url,
            "deepseek": self.deepseek_base_url,
        }[provider]

    def keys_for(self, provider: str) -> list[str]:
        """Les clés d'un fournisseur, dans l'ordre, sans doublon (clé unique à la fin)."""
        many, single = {
            "groq": (self.groq_api_keys, None),
            "gemini": (self.gemini_api_keys, self.gemini_api_key),
            "deepseek": (self.deepseek_api_keys, None),
            "tavily": (self.tavily_api_keys, self.tavily_api_key),
            "factcheck": (self.google_factcheck_api_keys, self.google_factcheck_api_key),
            "elevenlabs": (self.elevenlabs_api_keys, None),
        }[provider]
        secrets = [*many, *([single] if single else [])]
        return list(dict.fromkeys(secret.get_secret_value() for secret in secrets))


@cache
def get_settings() -> Settings:
    """Lit l'environnement une seule fois, au premier appel."""
    return Settings()


SettingsDep = Annotated[Settings, Depends(get_settings)]
