"""Recherche sur le web des articles et messages qui rapportent une information.

- Tavily (https://tavily.com), si sa clé est configurée : rapide (2 à 3 s), presse, forums,
  Reddit, pages publiques de réseaux sociaux. On cherche avec la phrase entière.
- Sinon GDELT (https://www.gdeltproject.org) : gratuit, sans clé, presse des trois derniers
  mois, mais lent et souvent saturé. On y cherche par mots-clés, puis on lit chaque page.

Le serveur web garde ensuite les résultats proches par le sens.

Toute panne (réseau coupé, moteur saturé, `DEMO_OFFLINE`) lève `WebSearchUnavailableError` :
la route renvoie alors la réponse de secours `app/fallbacks/web-sources.json`.
"""

import asyncio
import contextlib
import json
import logging
import re
import unicodedata
from dataclasses import dataclass, field
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from typing import Any
from urllib.parse import urljoin, urlparse

import httpx

from app.core.config import Settings

logger = logging.getLogger(__name__)

GDELT_URL = "https://api.gdeltproject.org/api/v2/doc/doc"
# GDELT refuse plus d'une requête toutes les cinq secondes.
GDELT_SPACING_SECONDS = 5.5
GDELT_RETRIES = 2
# GDELT met souvent plus de dix secondes à répondre.
GDELT_TIMEOUT_SECONDS = 25.0
TAVILY_URL = "https://api.tavily.com/search"
TAVILY_TIMEOUT_SECONDS = 15.0
TAVILY_QUERY_MAX_CHARS = 380
# Temps accordé pour aller lire la date des articles que la recherche n'a pas datés.
DATE_SECONDS = 8.0
# Pages lues pour compléter les résultats (date, texte, liens), en même temps et en temps limité.
PAGES_TO_COMPLETE = 40
# GDELT : nombre d'articles gardés par recherche.
MAX_ARTICLES = 8
# Tavily : résultats par requête, et autres formulations de l'information cherchées en plus.
TAVILY_MAX_RESULTS = 20
MAX_QUERIES = 6
# Requête ciblée sur les réseaux sociaux et les forums publics.
SOCIAL_DOMAINS = [
    "facebook.com",
    "x.com",
    "twitter.com",
    "reddit.com",
    "youtube.com",
    "tiktok.com",
    "instagram.com",
    "t.me",
]
# Lecture de pages données (exploration en suivant les liens).
PAGES_MAX = 30
PAGE_TIMEOUT_SECONDS = 8.0
PAGES_TOTAL_SECONDS = 14.0
# On ne lit que le début des pages : titre, date et premières lignes sont en haut.
PAGE_MAX_BYTES = 600_000
EXCERPT_MAX_CHARS = 500
# Début du texte et liens gardés par page : assez pour repérer les phrases recopiées et la source
# citée, sans alourdir la réponse.
BODY_MAX_CHARS = 4_000
LINKS_MAX = 150
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
    # Le texte de la page (début) et ses liens sortants : ils servent à retrouver qui reprend qui
    # (phrases recopiées, lien vers l'article d'origine).
    body: str = ""
    links: list[str] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return {
            "url": self.url,
            "title": self.title,
            "site": self.site,
            "published_at": self.published_at,
            "excerpt": self.excerpt,
            "language": self.language,
            "body": self.body,
            "links": self.links,
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
        self.links: list[str] = []
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
        elif tag == "a" and attributes.get("href") and len(self.links) < LINKS_MAX:
            self.links.append(attributes["href"])

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


def read_page(html: str, base_url: str = "") -> dict[str, Any]:
    """Titre, date (ISO), extrait, texte et liens d'une page HTML. Champs absents : None ou vide."""
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
    links = [urljoin(base_url, href) for href in reader.links]
    return {
        "title": title.strip() or None,
        "published_at": _iso_date(published),
        "excerpt": _shorten(" ".join(excerpt.split())) or None,
        "body": " ".join(reader.paragraphs)[:BODY_MAX_CHARS],
        "links": [link for link in links if link.startswith("http")],
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


async def _fetch_page(client: httpx.AsyncClient, url: str) -> dict[str, Any] | None:
    """Titre, date et extrait d'une page web ; None si elle ne se lit pas (bloquée, lente…)."""
    try:
        async with client.stream("GET", url, timeout=PAGE_TIMEOUT_SECONDS) as response:
            response.raise_for_status()
            if "html" not in response.headers.get("content-type", ""):
                return None
            body = b""
            async for chunk in response.aiter_bytes():
                body += chunk
                if len(body) >= PAGE_MAX_BYTES:
                    break
            html = body.decode(response.encoding or "utf-8", errors="replace")
    except httpx.HTTPError:
        return None
    return read_page(html, url)


async def _read_article(client: httpx.AsyncClient, item: dict[str, Any]) -> WebArticle:
    url = str(item["url"])
    article = WebArticle(
        url=url,
        title=" ".join(str(item.get("title") or "").split()),
        site=str(item.get("domain") or _site(url)),
        published_at=_gdelt_date(item.get("seendate")),
        excerpt="",
        language=str(item["language"]) if item.get("language") else None,
    )
    page = await _fetch_page(client, url)
    if page is None:
        # Page illisible : on garde ce que GDELT en dit.
        return article
    article.title = page["title"] or article.title
    article.published_at = page["published_at"] or article.published_at
    article.excerpt = page["excerpt"] or ""
    article.body = page["body"]
    article.links = page["links"]
    return article


def _site(url: str) -> str:
    host = urlparse(url).hostname or url
    return host.removeprefix("www.")


async def _finish(tasks: list[asyncio.Task[Any]], seconds: float) -> list[Any]:
    """Résultats des tâches finies à temps ; les autres sont abandonnées."""
    if not tasks:
        return []
    done, pending = await asyncio.wait(tasks, timeout=seconds)
    for task in pending:
        task.cancel()
    await asyncio.gather(*pending, return_exceptions=True)
    return [task.result() for task in done if not task.exception()]


async def find_articles(
    settings: Settings,
    claim: str,
    queries: list[str] | None = None,
    *,
    transport: httpx.AsyncBaseTransport | None = None,
) -> tuple[list[WebArticle], str]:
    """Articles proches de l'information, datés, et le moteur utilisé (« tavily » ou « gdelt »).

    Tavily si sa clé est configurée (rapide, presse, forums, réseaux) : l'information elle-même,
    plus les autres formulations `queries` (mots-clés, autres langues). Sinon GDELT (presse).
    Lève WebSearchUnavailableError si la recherche ne peut pas se faire.
    """
    if settings.demo_offline:
        raise WebSearchUnavailableError("offline")
    if settings.tavily_api_key is not None:
        key = settings.tavily_api_key.get_secret_value()
        return await _find_with_tavily(key, claim, queries or [], transport), "tavily"
    return await _find_with_gdelt(claim, transport), "gdelt"


async def _tavily(
    client: httpx.AsyncClient,
    key: str,
    query: str,
    topic: str,
    domains: list[str] | None = None,
) -> list[dict[str, Any]]:
    body: dict[str, Any] = {
        # Tavily accepte une phrase entière : l'information elle-même est une bonne requête.
        "query": query[:TAVILY_QUERY_MAX_CHARS],
        "topic": topic,
        "search_depth": "basic",
        "max_results": TAVILY_MAX_RESULTS,
        # Le texte de chaque page, en Markdown : on y lit les phrases et les liens.
        "include_raw_content": "markdown",
    }
    if domains:
        body["include_domains"] = domains
    response = await client.post(TAVILY_URL, headers={"Authorization": f"Bearer {key}"}, json=body)
    response.raise_for_status()
    data = response.json()
    results = data.get("results", []) if isinstance(data, dict) else []
    return [item for item in results if isinstance(item, dict) and item.get("url")]


def _from_tavily(item: dict[str, Any]) -> WebArticle:
    url = str(item["url"])
    published = item.get("published_date")
    raw = str(item.get("raw_content") or "")
    return WebArticle(
        url=url,
        title=" ".join(str(item.get("title") or "").split()),
        site=_site(url),
        published_at=_rfc_date(published) if isinstance(published, str) else None,
        # Le contenu renvoyé est du Markdown : on garde le texte.
        excerpt=_shorten(
            " ".join(re.sub(r"[#*_>`|]+", " ", str(item.get("content") or "")).split())
        ),
        language=None,
        body=_markdown_text(raw)[:BODY_MAX_CHARS],
        links=re.findall(r"\]\((https?://[^)\s]+)\)", raw)[:LINKS_MAX],
    )


def _markdown_text(markdown: str) -> str:
    """Le texte d'une page en Markdown, sans images ni adresses de liens."""
    text = re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", markdown)
    text = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", text)
    return " ".join(re.sub(r"[#*_>`|]+", " ", text).split())


def _rfc_date(value: str) -> str | None:
    """Date au format des actualités (« Thu, 12 Nov 2026 00:00:00 GMT ») ou ISO, en ISO."""
    try:
        return parsedate_to_datetime(value).astimezone(UTC).isoformat()
    except (TypeError, ValueError, IndexError):
        return _iso_date(value)


async def _find_with_tavily(
    key: str, claim: str, queries: list[str], transport: httpx.AsyncBaseTransport | None
) -> list[WebArticle]:
    headers = {"User-Agent": USER_AGENT}
    async with httpx.AsyncClient(
        timeout=TAVILY_TIMEOUT_SECONDS, follow_redirects=True, headers=headers, transport=transport
    ) as client:
        # Tout en même temps : l'information en actualités (datées) et sur le web général, sur les
        # réseaux sociaux, puis chaque autre formulation (mots-clés, autres langues).
        others = [query for query in queries if query.strip() and query.strip() != claim.strip()]
        responses = await asyncio.gather(
            _tavily(client, key, claim, "news"),
            _tavily(client, key, claim, "general"),
            _tavily(client, key, claim, "general", SOCIAL_DOMAINS),
            *(_tavily(client, key, query, "general") for query in others[:MAX_QUERIES]),
            return_exceptions=True,
        )
        if all(isinstance(response, BaseException) for response in responses):
            logger.warning("tavily : recherche impossible (%s)", type(responses[0]).__name__)
            raise WebSearchUnavailableError("tavily")

        articles: dict[str, WebArticle] = {}
        for response in responses:
            if isinstance(response, BaseException):
                continue
            for item in response:
                article = _from_tavily(item)
                if article.title:
                    articles.setdefault(article.url, article)

        # Sans date ou sans texte, on va les lire sur la page, en temps limité : sinon l'article
        # reste non daté, ou comparé aux autres par son seul extrait.
        incomplete = [
            article
            for article in articles.values()
            if article.published_at is None or not article.body
        ][:PAGES_TO_COMPLETE]

        async def complete(article: WebArticle) -> None:
            page = await _fetch_page(client, article.url)
            if page is None:
                return
            article.published_at = article.published_at or page["published_at"]
            article.body = article.body or page["body"]
            article.links = article.links or page["links"]

        tasks = [asyncio.create_task(complete(article)) for article in incomplete]
        await _finish(tasks, DATE_SECONDS)
    logger.info("tavily : %d articles, %d complétés sur leur page", len(articles), len(incomplete))
    return list(articles.values())


async def _find_with_gdelt(
    claim: str, transport: httpx.AsyncBaseTransport | None
) -> list[WebArticle]:
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
        articles: list[WebArticle] = await _finish(tasks, PAGES_TOTAL_SECONDS)
    logger.info("gdelt : %d articles trouvés, %d lus", len(unique), len(articles))
    return [article for article in articles if article.title]


async def read_pages(
    settings: Settings, urls: list[str], *, transport: httpx.AsyncBaseTransport | None = None
) -> list[WebArticle]:
    """Titre, date, extrait, texte et liens de pages données (les liens d'un article qu'on suit
    pour remonter à ses sources). Les pages illisibles ou trop lentes sont ignorées."""
    if settings.demo_offline:
        raise WebSearchUnavailableError("offline")
    unique = list(dict.fromkeys(url for url in urls if url.startswith("http")))[:PAGES_MAX]
    async with httpx.AsyncClient(
        timeout=PAGE_TIMEOUT_SECONDS,
        follow_redirects=True,
        headers={"User-Agent": USER_AGENT},
        transport=transport,
    ) as client:

        async def read(url: str) -> WebArticle | None:
            page = await _fetch_page(client, url)
            if page is None or not page["title"]:
                return None
            return WebArticle(
                url=url,
                title=page["title"],
                site=_site(url),
                published_at=page["published_at"],
                excerpt=page["excerpt"] or "",
                language=None,
                body=page["body"],
                links=page["links"],
            )

        results = await _finish([asyncio.create_task(read(url)) for url in unique], DATE_SECONDS)
    articles = [article for article in results if article is not None]
    logger.info("pages : %d lues sur %d", len(articles), len(unique))
    return articles
