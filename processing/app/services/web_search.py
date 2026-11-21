"""Recherche d'articles de presse qui rapportent une information (GDELT), puis lecture des pages.

GDELT (https://www.gdeltproject.org) recense la presse mondiale : gratuit, sans clé, articles
des trois derniers mois, une requête toutes les cinq secondes au plus. On y cherche par
mots-clés ; le serveur web garde ensuite les articles proches par le sens.

Toute panne (réseau coupé, GDELT saturé, `DEMO_OFFLINE`) lève `WebSearchUnavailableError` :
la route renvoie alors la réponse de secours `app/fallbacks/web-sources.json`.
"""

import asyncio
import contextlib
import json
import logging
import re
import unicodedata
from dataclasses import dataclass
from datetime import UTC, datetime
from html.parser import HTMLParser
from typing import Any
from urllib.parse import urlparse

import httpx

from app.core.config import Settings

logger = logging.getLogger(__name__)

GDELT_URL = "https://api.gdeltproject.org/api/v2/doc/doc"
# GDELT refuse plus d'une requête toutes les cinq secondes.
GDELT_SPACING_SECONDS = 5.5
GDELT_RETRIES = 2
# GDELT met souvent plus de dix secondes à répondre.
GDELT_TIMEOUT_SECONDS = 25.0
MAX_ARTICLES = 8
PAGE_TIMEOUT_SECONDS = 8.0
PAGES_TOTAL_SECONDS = 14.0
# On ne lit que le début des pages : titre, date et premières lignes sont en haut.
PAGE_MAX_BYTES = 600_000
EXCERPT_MAX_CHARS = 500
USER_AGENT = "MindStack/0.1 (verification d'informations, DevFest 2026)"

STOP_WORDS = frozenset(
    [
        "alors",
        "aussi",
        "autre",
        "avant",
        "avec",
        "avoir",
        "cette",
        "celle",
        "celui",
        "ceux",
        "comme",
        "dans",
        "depuis",
        "donc",
        "elle",
        "elles",
        "encore",
        "entre",
        "etre",
        "fait",
        "faire",
        "leur",
        "leurs",
        "mais",
        "meme",
        "nous",
        "notre",
        "pour",
        "plus",
        "quand",
        "quel",
        "quelle",
        "sans",
        "selon",
        "sont",
        "sous",
        "tous",
        "tout",
        "toute",
        "toutes",
        "tres",
        "vous",
        "votre",
        "voici",
        "voila",
        "urgent",
        "partagez",
        "vite",
        "vient",
        "viens",
        "aujourd",
        "hier",
        "demain",
        "matin",
        "soir",
        "ceci",
        "cela",
        "partager",
        "faites",
        "annonce",
    ]
)


class WebSearchUnavailableError(Exception):
    """La recherche n'a pas pu se faire (hors ligne, GDELT indisponible)."""


@dataclass
class WebArticle:
    url: str
    title: str
    site: str
    published_at: str | None
    excerpt: str
    language: str | None

    def as_dict(self) -> dict[str, Any]:
        return {
            "url": self.url,
            "title": self.title,
            "site": self.site,
            "published_at": self.published_at,
            "excerpt": self.excerpt,
            "language": self.language,
        }


def keywords(claim: str, limit: int) -> list[str]:
    """Les mots les plus parlants de l'information : noms propres d'abord, puis les plus longs."""
    # Le code 2019 : l'apostrophe typographique, fréquente dans les textes copiés.
    words = re.findall("[\\wÀ-ÿ'\u2019-]+", claim)
    seen: set[str] = set()
    scored: list[tuple[int, int, str]] = []
    for index, raw in enumerate(words):
        word = raw.strip("'\u2019-")
        plain = _plain(word)
        if len(plain) < 4 or plain in STOP_WORDS or plain in seen or plain.isdigit():
            continue
        seen.add(plain)
        is_name = word[:1].isupper() and index > 0
        scored.append((1 if is_name else 0, len(plain), word))
    scored.sort(key=lambda item: (item[0], item[1]), reverse=True)
    return [word for _, _, word in scored[:limit]]


def _plain(word: str) -> str:
    decomposed = unicodedata.normalize("NFD", word.lower())
    return "".join(char for char in decomposed if unicodedata.category(char) != "Mn")


async def _gdelt(client: httpx.AsyncClient, words: list[str]) -> list[dict[str, Any]]:
    params = {
        "query": " ".join(words),
        "mode": "artlist",
        "format": "json",
        "maxrecords": str(MAX_ARTICLES * 2),
        "sort": "hybridrel",
    }
    response = await client.get(GDELT_URL, params=params)
    for _ in range(GDELT_RETRIES):
        if response.status_code != 429:
            break
        # Saturé : GDELT demande d'attendre cinq secondes entre deux requêtes.
        await asyncio.sleep(GDELT_SPACING_SECONDS)
        response = await client.get(GDELT_URL, params=params)
    response.raise_for_status()
    try:
        data = response.json()
    except json.JSONDecodeError:
        # GDELT répond en texte quand la requête ne lui plaît pas (mot trop court…) : aucun article.
        return []
    articles = data.get("articles", []) if isinstance(data, dict) else []
    return [item for item in articles if isinstance(item, dict) and item.get("url")]


def _gdelt_date(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    try:
        return datetime.strptime(value, "%Y%m%dT%H%M%SZ").replace(tzinfo=UTC).isoformat()
    except ValueError:
        return None


class _PageReader(HTMLParser):
    """Titre, date de publication et premières phrases d'une page d'article."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.meta: dict[str, str] = {}
        self.title = ""
        self.time_datetime: str | None = None
        self.paragraphs: list[str] = []
        self._in_title = False
        self._in_p = False
        self._current: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = {key: value or "" for key, value in attrs}
        if tag == "meta":
            key = attributes.get("property") or attributes.get("name") or attributes.get("itemprop")
            if key and "content" in attributes:
                self.meta.setdefault(key.lower(), attributes["content"])
        elif tag == "title":
            self._in_title = True
        elif tag == "time" and self.time_datetime is None and attributes.get("datetime"):
            self.time_datetime = attributes["datetime"]
        elif tag == "p":
            self._in_p = True
            self._current = []

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self._in_title = False
        elif tag == "p" and self._in_p:
            self._in_p = False
            text = " ".join("".join(self._current).split())
            if len(text) > 60:
                self.paragraphs.append(text)

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self.title += data
        elif self._in_p:
            self._current.append(data)


def read_page(html: str) -> dict[str, str | None]:
    """Titre, date (ISO) et extrait d'une page HTML. Champs absents : None."""
    reader = _PageReader()
    # Une page mal formée donne ce qui a pu être lu avant l'erreur.
    with contextlib.suppress(AssertionError, ValueError):
        reader.feed(html)
    meta = reader.meta
    published = (
        meta.get("article:published_time")
        or meta.get("datepublished")
        or meta.get("date")
        or meta.get("dc.date")
        or _json_ld_date(html)
        or reader.time_datetime
    )
    excerpt = meta.get("og:description") or meta.get("description") or ""
    if len(excerpt) < 80 and reader.paragraphs:
        excerpt = " ".join(reader.paragraphs[:2])
    title = meta.get("og:title") or " ".join(reader.title.split())
    return {
        "title": title.strip() or None,
        "published_at": _iso_date(published),
        "excerpt": _shorten(" ".join(excerpt.split())) or None,
    }


def _json_ld_date(html: str) -> str | None:
    match = re.search(r'"datePublished"\s*:\s*"([^"]+)"', html)
    return match.group(1) if match else None


def _iso_date(value: str | None) -> str | None:
    if not value:
        return None
    cleaned = value.strip().replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(cleaned)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)
    return parsed.isoformat()


def _shorten(text: str) -> str:
    if len(text) <= EXCERPT_MAX_CHARS:
        return text
    cut = text[:EXCERPT_MAX_CHARS]
    return cut[: cut.rfind(" ")].rstrip(" ,;:") + "…"


async def _read_article(client: httpx.AsyncClient, item: dict[str, Any]) -> WebArticle:
    url = str(item["url"])
    article = WebArticle(
        url=url,
        title=" ".join(str(item.get("title") or "").split()),
        site=str(item.get("domain") or urlparse(url).hostname or url),
        published_at=_gdelt_date(item.get("seendate")),
        excerpt="",
        language=str(item["language"]) if item.get("language") else None,
    )
    try:
        async with client.stream("GET", url, timeout=PAGE_TIMEOUT_SECONDS) as response:
            response.raise_for_status()
            if "html" not in response.headers.get("content-type", ""):
                return article
            body = b""
            async for chunk in response.aiter_bytes():
                body += chunk
                if len(body) >= PAGE_MAX_BYTES:
                    break
            html = body.decode(response.encoding or "utf-8", errors="replace")
    except httpx.HTTPError:
        # Page illisible (bloquée, trop lente) : on garde ce que GDELT en dit.
        return article
    page = read_page(html)
    article.title = page["title"] or article.title
    article.published_at = page["published_at"] or article.published_at
    article.excerpt = page["excerpt"] or ""
    return article


async def find_articles(
    settings: Settings, claim: str, *, transport: httpx.AsyncBaseTransport | None = None
) -> list[WebArticle]:
    """Articles de presse proches de l'information, lus et datés. Lève WebSearchUnavailableError."""
    if settings.demo_offline:
        raise WebSearchUnavailableError("offline")
    headers = {"User-Agent": USER_AGENT}
    async with httpx.AsyncClient(
        timeout=GDELT_TIMEOUT_SECONDS, follow_redirects=True, headers=headers, transport=transport
    ) as client:
        try:
            found: list[dict[str, Any]] = []
            # Trois mots-clés d'abord ; si rien, deux seulement (requête plus large).
            for attempt, limit in enumerate((3, 2)):
                words = keywords(claim, limit)
                if not words:
                    break
                if attempt > 0:
                    await asyncio.sleep(GDELT_SPACING_SECONDS)
                found = await _gdelt(client, words)
                if found:
                    break
        except httpx.HTTPError as exc:
            logger.warning("gdelt : recherche impossible (%s)", type(exc).__name__)
            raise WebSearchUnavailableError(type(exc).__name__) from exc

        unique = list({str(item["url"]): item for item in found}.values())[:MAX_ARTICLES]
        tasks = [asyncio.create_task(_read_article(client, item)) for item in unique]
        if not tasks:
            return []
        done, pending = await asyncio.wait(tasks, timeout=PAGES_TOTAL_SECONDS)
        for task in pending:
            task.cancel()
        await asyncio.gather(*pending, return_exceptions=True)
    articles = [task.result() for task in done if not task.exception()]
    logger.info("gdelt : %d articles trouvés, %d lus", len(unique), len(articles))
    return [article for article in articles if article.title]
