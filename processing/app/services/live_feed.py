"""Le fil d'actualité réel : ce qui circule, lu sans compte dans des sources publiques.

Le serveur web envoie ses sources (type, adresse, nom) et reçoit leurs dernières publications
sous une forme commune, avec image quand il y en a une. Aucune IA ici.

- `rss` : flux RSS ou Atom (journal, fact-checker) ; image du flux, sinon celle de la page ;
- `youtube` : flux d'une chaîne YouTube, avec vignette et nombre de vues ;
- `mastodon` : publications publiques de Mastodon (un mot-dièse, ou les tendances d'un serveur) ;
- `google-trends` : les recherches qui montent dans un pays, avec les articles liés ;
- `facebook` : pages et groupes Facebook publics trouvés par Tavily (clé dans `.env`).
"""

import asyncio
import html
import logging
import re
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from typing import Any
from urllib.parse import parse_qs, quote, urlparse
from xml.etree import ElementTree

import httpx

from app.services.news_feeds import USER_AGENT, parse_feed

logger = logging.getLogger(__name__)

SOURCE_TIMEOUT_SECONDS = 12.0
SOURCES_TOTAL_SECONDS = 25.0
PAGE_IMAGES_MAX = 40
PAGE_IMAGES_CONCURRENCY = 6
PAGE_IMAGES_TOTAL_SECONDS = 10.0
CONCURRENCY = 4
# La résolution de noms de Docker échoue au hasard (environ une fois sur quatre mesuré le
# 21 novembre) : on retente, en espaçant, avant d'abandonner une source.
CONNECT_RETRIES = 4
RETRY_PAUSE_SECONDS = 0.5
TEXT_MAX_CHARS = 600
# Sans compter liens et mots-dièses : en dessous, ce n'est pas une information.
SOCIAL_MIN_CHARS = 60
LANGUAGES = frozenset({"fr", "en", "mg"})

ATOM = "{http://www.w3.org/2005/Atom}"
MEDIA = "{http://search.yahoo.com/mrss/}"
TRENDS = "{https://trends.google.com/trending/rss}"
TAVILY_URL = "https://api.tavily.com/search"
FACEBOOK_SUFFIX = re.compile(r"\s*[-|]\s*Facebook\s*$", re.IGNORECASE)
# Pied de page ajouté par WordPress aux résumés : « L'article X est apparu en premier sur Y. »
WORDPRESS_FOOTER = re.compile(
    r"\s*(?:L[\u2019']article .+? est apparu en premier sur .+?"
    r"|The post .+? appeared first on .+?)\.?\s*$"
)
FACEBOOK_VIDEO_TITLE = re.compile(
    r"^([\d.,]+\s*[KkMm]?) views?\s*·\s*[\d.,]+\s*[KkMm]?\s*reactions?\s*\|\s*(.+?)(?:\s*\|[^|]*)?$"
)
MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
]
MONTHS = {name.lower(): number for number, name in enumerate(MONTH_NAMES, start=1)}
_MONTH = "|".join(MONTH_NAMES)
FACEBOOK_DATE = re.compile(
    rf"\b(?:(\d{{1,2}}) ({_MONTH}),? (\d{{4}})|({_MONTH}) (\d{{1,2}}), (\d{{4}}))\b"
)
FACEBOOK_ON = re.compile(r"^(.+?) on Facebook\b", re.IGNORECASE)
PAGE_IMAGE = (
    re.compile(
        r"<meta[^>]+(?:property|name)=[\"'](?:og:image|twitter:image)[\"'][^>]*"
        r"content=[\"']([^\"']+)[\"']",
        re.IGNORECASE,
    ),
    re.compile(
        r"<meta[^>]+content=[\"']([^\"']+)[\"'][^>]*"
        r"(?:property|name)=[\"'](?:og:image|twitter:image)[\"']",
        re.IGNORECASE,
    ),
)


@dataclass
class LiveSource:
    type: str
    # Adresse du flux, ou texte cherché pour `facebook`.
    target: str
    name: str


@dataclass
class LiveItem:
    url: str
    text: str
    source_name: str
    title: str | None = None
    image_url: str | None = None
    published_at: str | None = None
    # Compte, page ou groupe qui publie (jamais le nom d'une personne pour Facebook).
    author: str | None = None
    # Vues, partages ou recherches, selon la source.
    reach: int | None = None

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


def _plain(markup: str) -> str:
    """Texte d'un fragment HTML, paragraphes gardés."""
    text = re.sub(r"<br\s*/?>|</p>", "\n", markup, flags=re.IGNORECASE)
    text = html.unescape(re.sub(r"<[^>]+>", "", text))
    lines = (" ".join(line.split()) for line in text.splitlines())
    return "\n".join(line for line in lines if line)


def _shorten(text: str, limit: int = TEXT_MAX_CHARS) -> str:
    if len(text) <= limit:
        return text
    cut = text[:limit]
    return cut[: cut.rfind(" ")].rstrip(" ,;:") + "…"


def _meaningful_length(text: str) -> int:
    without = re.sub(r"https?://\S+|#\s?\w+|@\w+", "", text)
    return len(" ".join(without.split()))


def _iso(value: str) -> str | None:
    value = value.strip()
    if not value:
        return None
    try:
        return parsedate_to_datetime(value).isoformat()
    except (TypeError, ValueError, IndexError):
        pass
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).isoformat()
    except ValueError:
        return None


def _xml(text: str) -> ElementTree.Element | None:
    try:
        return ElementTree.fromstring(text.encode("utf-8"))
    except ElementTree.ParseError:
        return None


def parse_youtube(xml: str, source_name: str) -> list[LiveItem]:
    """Les vidéos d'une chaîne, avec leur vignette et leur nombre de vues."""
    root = _xml(xml)
    if root is None:
        return []
    items: list[LiveItem] = []
    for entry in root.iter(f"{ATOM}entry"):
        link = entry.find(f"{ATOM}link")
        url = link.get("href", "") if link is not None else ""
        title = " ".join((entry.findtext(f"{ATOM}title") or "").split())
        if not url or not title:
            continue
        description = " ".join((entry.findtext(f".//{MEDIA}description") or "").split())
        thumbnail = entry.find(f".//{MEDIA}thumbnail")
        statistics = entry.find(f".//{MEDIA}statistics")
        views = statistics.get("views", "") if statistics is not None else ""
        items.append(
            LiveItem(
                url=url,
                title=title,
                text="" if description == title else _shorten(description),
                source_name=source_name,
                image_url=thumbnail.get("url") if thumbnail is not None else None,
                published_at=_iso(entry.findtext(f"{ATOM}published") or ""),
                reach=int(views) if views.isdigit() else None,
            )
        )
    return items


def parse_mastodon(statuses: Any, source_name: str, host: str) -> list[LiveItem]:
    """Publications publiques en français, anglais ou malgache, sans contenu marqué sensible."""
    items: list[LiveItem] = []
    for raw in statuses if isinstance(statuses, list) else []:
        status = raw.get("reblog") or raw
        if status.get("sensitive") or status.get("spoiler_text") or status.get("in_reply_to_id"):
            continue
        if status.get("visibility", "public") != "public":
            continue
        if (status.get("language") or "") not in LANGUAGES:
            continue
        text = _plain(status.get("content") or "")
        url = status.get("url") or status.get("uri") or ""
        if _meaningful_length(text) < SOCIAL_MIN_CHARS or not url.startswith("http"):
            continue
        acct = (status.get("account") or {}).get("acct") or ""
        if acct and "@" not in acct:
            acct = f"{acct}@{host}"
        images = [
            media.get("preview_url") or media.get("url")
            for media in status.get("media_attachments") or []
            if media.get("type") == "image"
        ]
        card_image = (status.get("card") or {}).get("image")
        items.append(
            LiveItem(
                url=url,
                text=_shorten(text),
                source_name=source_name,
                image_url=images[0] if images else card_image,
                published_at=_iso(status.get("created_at") or ""),
                author=f"@{acct}" if acct else None,
                reach=status.get("reblogs_count"),
            )
        )
    return items


def _traffic(value: str) -> int | None:
    """« 1000+ », « 20 000+ », « 2K+ » : nombre de recherches."""
    match = re.match(r"\s*([\d\s.,]+)\s*([KkMm])?", value)
    if not match:
        return None
    digits = re.sub(r"\D", "", match.group(1))
    if not digits:
        return None
    factor = {"k": 1_000, "m": 1_000_000}.get((match.group(2) or "").lower(), 1)
    return int(digits) * factor


def parse_google_trends(xml: str, source_name: str, geo: str) -> list[LiveItem]:
    """Les recherches qui montent dans un pays, avec les titres des articles qui en parlent."""
    root = _xml(xml)
    if root is None:
        return []
    items: list[LiveItem] = []
    for item in root.iter("item"):
        term = " ".join((item.findtext("title") or "").split())
        if not term:
            continue
        headlines: list[str] = []
        for news in item.iter(f"{TRENDS}news_item"):
            raw_headline = news.findtext(f"{TRENDS}news_item_title") or ""
            headline = html.unescape(" ".join(raw_headline.split()))
            outlet = " ".join((news.findtext(f"{TRENDS}news_item_source") or "").split())
            if headline:
                headlines.append(f"{headline} ({outlet})" if outlet else headline)
        items.append(
            LiveItem(
                url=f"https://trends.google.com/trends/explore?q={quote(term)}&geo={geo}",
                title=term,
                text="\n".join(headlines[:3]),
                source_name=source_name,
                image_url=(item.findtext(f"{TRENDS}picture") or "").strip() or None,
                published_at=_iso(item.findtext("pubDate") or ""),
                reach=_traffic(item.findtext(f"{TRENDS}approx_traffic") or ""),
            )
        )
    return items


def _facebook_place(path: str, title: str) -> tuple[str, str | None]:
    """Où le post a été publié (groupe ou page), et son titre s'il en a un.

    Un profil de personne n'est jamais nommé : seules les pages et les groupes publics le sont.
    """
    segments = [segment for segment in path.split("/") if segment]
    title = re.sub(r"^Other posts\s*-\s*", "", title, flags=re.IGNORECASE).strip()
    named = FACEBOOK_SUFFIX.search(title) is not None
    # « Vaovao eto Madagasikara | - Facebook » : on retire aussi le séparateur resté au bout.
    name = re.sub(r"[\s|·-]+$", "", FACEBOOK_SUFFIX.sub("", title)).strip()
    on_facebook = FACEBOOK_ON.match(title)
    post_title = None if named or on_facebook else name or None
    if segments[:1] == ["groups"]:
        return (f"Groupe public « {name} »" if named and name else "Groupe public"), post_title
    slug = segments[0] if segments else ""
    personal = not slug or slug.isdigit() or slug in {"people", "profile.php"}
    if personal or re.search(r"\.\d+$", slug):
        return "Page ou profil public", post_title
    # Une page se nomme par son adresse (« orangeactu », « lexpress.mg ») : le titre de la page
    # Facebook est souvent le début d'un post.
    label = on_facebook.group(1) if on_facebook else slug
    return f"Page « {label} »", post_title


def _facebook_video(title: str) -> tuple[int | None, str]:
    """« 17K views · 667 reactions | Texte | Page » : nombre de vues et texte de la vidéo."""
    match = FACEBOOK_VIDEO_TITLE.match(title)
    if not match:
        return None, title
    return _traffic(match.group(1)), match.group(2).strip()


def _facebook_date(text: str) -> str | None:
    """Date écrite dans la page (« Tuesday 30 June 2026 », « August 18, 2026 »), sinon None."""
    match = FACEBOOK_DATE.search(text)
    if not match:
        return None
    day, month, year = (
        (match.group(1), match.group(2), match.group(3))
        if match.group(1)
        else (match.group(5), match.group(4), match.group(6))
    )
    try:
        found = datetime(int(year), MONTHS[month.lower()], int(day), tzinfo=UTC)
    except ValueError:
        return None
    return found.isoformat()


def _clean_facebook(content: str) -> str:
    text = " ".join(content.split())
    text = re.sub(r"^OCR:\s*", "", text)
    # Pages vidéo : titre répété avant « # Video. », puis commentaires et vidéos proposées.
    text = re.sub(r"^Title:.*?#\s*Video\.\s*", "", text)
    text = re.split(r"\s*##\s*(?:Comments|Related videos)\b", text)[0]
    text = text.replace("Sorry, we're having trouble with playing this video.", "")
    text = re.sub(r"Image \d+:\s*", "", text)
    text = " ".join(re.sub(r"[#*]+", "", text).split())
    first, *rest = re.split(r"\s*·?\s*Other posts\s*·?\s*", text)
    return first if _meaningful_length(first) >= SOCIAL_MIN_CHARS or not rest else " ".join(rest)


def parse_facebook(results: Any, source_name: str) -> list[LiveItem]:
    """Posts Facebook publics renvoyés par Tavily (sans date précise ni image)."""
    items: list[LiveItem] = []
    for result in results if isinstance(results, list) else []:
        url = str(result.get("url") or "")
        parsed = urlparse(url)
        if not parsed.netloc.endswith("facebook.com") or "/fb-answers/" in parsed.path:
            continue
        text = _clean_facebook(str(result.get("content") or ""))
        if _meaningful_length(text) < SOCIAL_MIN_CHARS:
            continue
        views, raw_title = _facebook_video(" ".join(str(result.get("title") or "").split()))
        place, title = _facebook_place(parsed.path, raw_title)
        if title and text.lower().startswith(title.rstrip(".… ").lower()[:40]):
            title = None
        published = _iso(str(result.get("published_date") or "")) or _facebook_date(text)
        items.append(
            LiveItem(
                url=url,
                title=title,
                text=_shorten(text),
                source_name=source_name,
                published_at=published,
                author=place,
                reach=views,
            )
        )
    return items


def clean_summary(text: str) -> str:
    """Résumé d'un flux sans les mentions ajoutées par le site (« Cliquez pour agrandir »…)."""
    text = re.sub(r"^Cliquez pour agrandir\s*", "", text)
    return WORDPRESS_FOOTER.sub("", text).strip()


def page_image(markup: str) -> str | None:
    """L'image de partage d'une page (og:image ou twitter:image)."""
    for pattern in PAGE_IMAGE:
        match = pattern.search(markup)
        if match and match.group(1).startswith("http"):
            return html.unescape(match.group(1))
    return None


async def _get(client: httpx.AsyncClient, url: str) -> httpx.Response:
    for attempt in range(CONNECT_RETRIES + 1):
        try:
            response = await client.get(url)
            response.raise_for_status()
            return response
        except httpx.ConnectError:
            if attempt == CONNECT_RETRIES:
                raise
            await asyncio.sleep(RETRY_PAUSE_SECONDS * (attempt + 1))
    raise httpx.ConnectError(url)


async def _search_facebook(client: httpx.AsyncClient, key: str, query: str) -> Any:
    payload = {
        "query": query,
        "topic": "general",
        "search_depth": "basic",
        "max_results": 10,
        "include_domains": ["facebook.com"],
        "time_range": "week",
    }
    for attempt in range(CONNECT_RETRIES + 1):
        try:
            response = await client.post(
                TAVILY_URL, headers={"Authorization": f"Bearer {key}"}, json=payload
            )
            break
        except httpx.ConnectError:
            if attempt == CONNECT_RETRIES:
                raise
            await asyncio.sleep(RETRY_PAUSE_SECONDS * (attempt + 1))
    response.raise_for_status()
    data = response.json()
    return data.get("results", []) if isinstance(data, dict) else []


async def _read_source(
    client: httpx.AsyncClient, source: LiveSource, tavily_key: str | None
) -> list[LiveItem]:
    try:
        if source.type == "facebook":
            if not tavily_key:
                return []
            return parse_facebook(
                await _search_facebook(client, tavily_key, source.target), source.name
            )
        response = await _get(client, source.target)
        if source.type == "rss":
            return [
                LiveItem(
                    url=item.url,
                    title=item.title,
                    text=clean_summary(item.summary),
                    source_name=item.source_name,
                    image_url=item.image_url,
                    published_at=item.published_at,
                )
                for item in parse_feed(response.text, source.name)
            ]
        if source.type == "youtube":
            return parse_youtube(response.text, source.name)
        if source.type == "mastodon":
            return parse_mastodon(response.json(), source.name, urlparse(source.target).netloc)
        if source.type == "google-trends":
            geo = parse_qs(urlparse(source.target).query).get("geo", [""])[0]
            return parse_google_trends(response.text, source.name, geo)
    except (httpx.HTTPError, ValueError) as exc:
        logger.warning("fil : %s illisible (%s)", source.name, type(exc).__name__)
    return []


async def _fill_page_images(client: httpx.AsyncClient, items: list[LiveItem]) -> None:
    """Articles sans image dans leur flux : on prend l'image de partage de leur page."""
    newest = sorted(items, key=lambda item: item.published_at or "", reverse=True)
    semaphore = asyncio.Semaphore(PAGE_IMAGES_CONCURRENCY)

    async def fill(item: LiveItem) -> None:
        async with semaphore:
            try:
                response = await _get(client, item.url)
            except httpx.HTTPError:
                return
        item.image_url = page_image(response.text)

    tasks = [asyncio.create_task(fill(item)) for item in newest[:PAGE_IMAGES_MAX]]
    if not tasks:
        return
    _, pending = await asyncio.wait(tasks, timeout=PAGE_IMAGES_TOTAL_SECONDS)
    for task in pending:
        task.cancel()
    await asyncio.gather(*pending, return_exceptions=True)


async def read_live_sources(
    sources: list[LiveSource],
    *,
    tavily_key: str | None,
    transport: httpx.AsyncBaseTransport | None = None,
) -> tuple[list[LiveItem], int]:
    """Publications de toutes les sources lues à temps, et le nombre de sources qui ont répondu."""
    semaphore = asyncio.Semaphore(CONCURRENCY)
    async with httpx.AsyncClient(
        timeout=SOURCE_TIMEOUT_SECONDS,
        follow_redirects=True,
        headers={"User-Agent": USER_AGENT},
        transport=transport,
    ) as client:

        async def guarded(source: LiveSource) -> list[LiveItem]:
            async with semaphore:
                return await _read_source(client, source, tavily_key)

        tasks = [asyncio.create_task(guarded(source)) for source in sources]
        done, pending = await asyncio.wait(tasks, timeout=SOURCES_TOTAL_SECONDS)
        for task in pending:
            task.cancel()
        await asyncio.gather(*pending, return_exceptions=True)
        by_source = {task: task.result() for task in done if not task.exception()}
        results = [by_source.get(task, []) for task in tasks]
        rss_without_image = [
            item
            for source, found in zip(sources, results, strict=True)
            if source.type == "rss"
            for item in found
            if not item.image_url
        ]
        await _fill_page_images(client, rss_without_image)
    items = [item for found in results for item in found]
    read = sum(1 for found in results if found)
    logger.info("fil : %d publications, %d sources lues sur %d", len(items), read, len(sources))
    return items, read
