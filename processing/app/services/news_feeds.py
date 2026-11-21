"""Lecture des flux RSS et Atom de journaux choisis : l'index de sources fiables.

Le serveur web envoie la liste des flux, reçoit leurs derniers articles (titre, lien, date,
résumé) et les enregistre dans sa base avec leur vecteur. La recherche d'une information se
fait ensuite dans cette base : instantanée, et possible même sans réseau.
"""

import asyncio
import html
import logging
import re
from dataclasses import dataclass
from datetime import datetime
from email.utils import parsedate_to_datetime
from typing import Any
from xml.etree import ElementTree

import httpx

from app.services.connect_retry import call_with_connect_retry_async

logger = logging.getLogger(__name__)

FEED_TIMEOUT_SECONDS = 12.0
FEEDS_TOTAL_SECONDS = 18.0
SUMMARY_MAX_CHARS = 500
USER_AGENT = "MindStack/0.1 (verification d'informations, DevFest 2026)"
ATOM = "{http://www.w3.org/2005/Atom}"
DUBLIN_CORE = "{http://purl.org/dc/elements/1.1/}"


@dataclass
class FeedItem:
    url: str
    title: str
    summary: str
    published_at: str | None
    source_name: str

    def as_dict(self) -> dict[str, Any]:
        return {
            "url": self.url,
            "title": self.title,
            "summary": self.summary,
            "published_at": self.published_at,
            "source_name": self.source_name,
        }


def _text(element: ElementTree.Element | None) -> str:
    if element is None:
        return ""
    raw = "".join(element.itertext())
    # Les résumés contiennent souvent du HTML : on garde le texte.
    plain = html.unescape(re.sub(r"<[^>]+>", " ", raw))
    return " ".join(plain.split())


def _shorten(text: str) -> str:
    if len(text) <= SUMMARY_MAX_CHARS:
        return text
    cut = text[:SUMMARY_MAX_CHARS]
    return cut[: cut.rfind(" ")].rstrip(" ,;:") + "…"


def _date(value: str) -> str | None:
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


def parse_feed(xml: str, source_name: str) -> list[FeedItem]:
    """Les articles d'un flux RSS 2.0 ou Atom. Flux illisible : liste vide."""
    try:
        root = ElementTree.fromstring(xml.encode("utf-8"))
    except ElementTree.ParseError:
        return []
    items: list[FeedItem] = []
    for item in root.iter("item"):
        url = _text(item.find("link"))
        title = _text(item.find("title"))
        if not url or not title:
            continue
        published = _text(item.find("pubDate")) or _text(item.find(f"{DUBLIN_CORE}date"))
        items.append(
            FeedItem(
                url=url,
                title=title,
                summary=_shorten(_text(item.find("description"))),
                published_at=_date(published),
                source_name=source_name,
            )
        )
    for entry in root.iter(f"{ATOM}entry"):
        link = entry.find(f"{ATOM}link")
        url = link.get("href", "") if link is not None else ""
        title = _text(entry.find(f"{ATOM}title"))
        if not url or not title:
            continue
        summary = _text(entry.find(f"{ATOM}summary")) or _text(entry.find(f"{ATOM}content"))
        published = _text(entry.find(f"{ATOM}published")) or _text(entry.find(f"{ATOM}updated"))
        items.append(
            FeedItem(
                url=url,
                title=title,
                summary=_shorten(summary),
                published_at=_date(published),
                source_name=source_name,
            )
        )
    return items


async def _read_feed(client: httpx.AsyncClient, url: str, name: str) -> list[FeedItem]:
    try:
        response = await call_with_connect_retry_async(lambda: client.get(url))
        response.raise_for_status()
    except httpx.HTTPError as exc:
        logger.warning("flux : %s illisible (%s)", name, type(exc).__name__)
        return []
    return parse_feed(response.text, name)


async def read_feeds(
    feeds: list[tuple[str, str]], *, transport: httpx.AsyncBaseTransport | None = None
) -> tuple[list[FeedItem], int]:
    """Articles de tous les flux `(adresse, nom)` lus à temps, et le nombre de flux lus."""
    async with httpx.AsyncClient(
        timeout=FEED_TIMEOUT_SECONDS,
        follow_redirects=True,
        headers={"User-Agent": USER_AGENT},
        transport=transport,
    ) as client:
        tasks = [asyncio.create_task(_read_feed(client, url, name)) for url, name in feeds]
        done, pending = await asyncio.wait(tasks, timeout=FEEDS_TOTAL_SECONDS)
        for task in pending:
            task.cancel()
        await asyncio.gather(*pending, return_exceptions=True)
    results = [task.result() for task in done if not task.exception()]
    items = [item for result in results for item in result]
    read = sum(1 for result in results if result)
    logger.info("flux : %d articles, %d flux lus sur %d", len(items), read, len(feeds))
    return items, read
