"""Ce qu'en disent déjà les vérificateurs de faits, et Wikipédia.

- Google Fact Check Tools (avec `GOOGLE_FACTCHECK_API_KEY`, gratuite) : les vérifications publiées
  dans le monde (format ClaimReview), avec leur conclusion telle que le vérificateur l'a écrite.
- Les rubriques de vérification connues (AFP Factuel, Africa Check, Les Observateurs…), cherchées
  par Tavily si sa clé est configurée. Une rumeur vient souvent de l'étranger : la liste reprend
  aussi des signataires du code de l'IFCN ailleurs dans le monde.
- Wikipédia en français, malgache et anglais, sans clé : le début de chaque article trouvé.

On relaie ce que les vérificateurs ont publié, sous leur nom : on ne réécrit jamais leur conclusion.
Toute panne rend une liste vide pour cette source ; les autres répondent quand même.
"""

import asyncio
import logging
import re
import unicodedata
from dataclasses import asdict, dataclass
from typing import Any
from urllib.parse import quote, urlparse

import httpx

from app.core.config import Settings
from app.services.connect_retry import call_with_connect_retry_async
from app.services.web_search import keywords

logger = logging.getLogger(__name__)

FACT_CHECK_TOOLS_URL = "https://factchecktools.googleapis.com/v1alpha1/claims:search"
TAVILY_URL = "https://api.tavily.com/search"
TIMEOUT_SECONDS = 12.0
QUERY_MAX_CHARS = 300
MAX_REVIEWS = 6
MAX_WIKIPEDIA_PER_LANGUAGE = 2
WIKIPEDIA_LANGUAGES = ("fr", "mg", "en")
WIKIPEDIA_RETRY_SECONDS = 1.0
# Wikipédia demande un User-Agent qui dit qui appelle.
USER_AGENT = "MindStack/0.1 (verification d'informations, DevFest 2026)"

# Rubriques de vérification : domaine, puis chemin de la rubrique quand le reste du site est un
# journal ordinaire.
FACT_CHECKERS = (
    "factuel.afp.com",
    "factcheck.afp.com",
    "africacheck.org",
    "observers.france24.com",
    "lemonde.fr/les-decodeurs",
    "francetvinfo.fr/vrai-ou-fake",
    "liberation.fr/checknews",
    "rfi.fr/fr/podcasts/les-dessous-de-l-infox",
    "20minutes.fr/societe/desintox",
    "snopes.com",
    "politifact.com",
    "factcheck.org",
    "fullfact.org",
    "leadstories.com",
    "maldita.es",
    "newtral.es",
    "chequeado.com",
    "aosfatos.org",
    "correctiv.org/faktencheck",
    "boomlive.in",
    "altnews.in",
    "dubawa.org",
    "pesacheck.org",
    "reuters.com/fact-check",
    "apnews.com/hub/ap-fact-check",
)


@dataclass
class FactCheck:
    url: str
    title: str
    # Le vérificateur, tel qu'il signe (« AFP Factuel », « Africa Check »…).
    publisher: str
    # Sa conclusion, mot pour mot ; None quand on n'a que l'article.
    rating: str | None
    claim: str | None
    excerpt: str
    published_at: str | None


@dataclass
class WikipediaArticle:
    url: str
    title: str
    language: str
    summary: str


def is_fact_checker_url(url: str) -> bool:
    """Vrai si la page est dans une rubrique de vérification connue (pas le reste du journal)."""
    try:
        parsed = urlparse(url)
    except ValueError:
        return False
    host = (parsed.hostname or "").lower()
    for entry in FACT_CHECKERS:
        domain, _, section = entry.partition("/")
        if host != domain and not host.endswith("." + domain):
            continue
        prefix = "/" + section.rstrip("/")
        if not section or parsed.path == prefix or parsed.path.startswith(prefix + "/"):
            return True
    return False


def _site(url: str) -> str:
    host = (urlparse(url).hostname or "").lower()
    return host.removeprefix("www.")


def _folded(text: str) -> str:
    """Minuscules sans accents, pour comparer des mots."""
    decomposed = unicodedata.normalize("NFKD", text.lower())
    return "".join(char for char in decomposed if not unicodedata.combining(char))


def _plain(text: str) -> str:
    return " ".join(re.sub(r"<[^>]+>|[#*_>`|]+", " ", text).split())


async def _claim_reviews(client: httpx.AsyncClient, key: str, query: str) -> list[FactCheck]:
    response = await call_with_connect_retry_async(
        lambda: client.get(
            FACT_CHECK_TOOLS_URL,
            params={"query": query, "languageCode": "fr", "pageSize": MAX_REVIEWS, "key": key},
        )
    )
    response.raise_for_status()
    found: list[FactCheck] = []
    for claim in response.json().get("claims", []):
        for review in claim.get("claimReview", [])[:1]:
            if not review.get("url"):
                continue
            found.append(
                FactCheck(
                    url=review["url"],
                    title=review.get("title") or str(claim.get("text", ""))[:120],
                    publisher=(review.get("publisher") or {}).get("name") or _site(review["url"]),
                    rating=review.get("textualRating"),
                    claim=claim.get("text"),
                    excerpt="",
                    published_at=review.get("reviewDate"),
                )
            )
    return found


async def _fact_checker_pages(client: httpx.AsyncClient, key: str, query: str) -> list[FactCheck]:
    domains = sorted({entry.split("/")[0] for entry in FACT_CHECKERS})
    body = {
        "query": query,
        "topic": "general",
        "search_depth": "basic",
        "max_results": MAX_REVIEWS + 4,
        "include_domains": domains,
    }
    response = await call_with_connect_retry_async(
        lambda: client.post(TAVILY_URL, headers={"Authorization": f"Bearer {key}"}, json=body)
    )
    response.raise_for_status()
    found: list[FactCheck] = []
    for item in response.json().get("results", []):
        url = str(item.get("url") or "")
        if not is_fact_checker_url(url):
            continue
        found.append(
            FactCheck(
                url=url,
                title=" ".join(str(item.get("title") or "").split()),
                publisher=_site(url),
                rating=None,
                claim=None,
                excerpt=_plain(str(item.get("content") or ""))[:400],
                published_at=item.get("published_date"),
            )
        )
    return found


async def _wikipedia(
    client: httpx.AsyncClient, query: str, language: str
) -> list[WikipediaArticle]:
    base = f"https://{language}.wikipedia.org"
    params = {
        "action": "query",
        "list": "search",
        "srsearch": query,
        "srlimit": MAX_WIKIPEDIA_PER_LANGUAGE,
        "format": "json",
    }
    response = await call_with_connect_retry_async(
        lambda: client.get(f"{base}/w/api.php", params=params)
    )
    if response.status_code in (429, 503):
        # Wikipédia freine les rafales de requêtes : un second essai une seconde plus tard.
        await asyncio.sleep(WIKIPEDIA_RETRY_SECONDS)
        response = await client.get(f"{base}/w/api.php", params=params)
    response.raise_for_status()
    articles: list[WikipediaArticle] = []
    for hit in response.json().get("query", {}).get("search", []):
        title = str(hit.get("title") or "")
        if not title:
            continue
        path = quote(title.replace(" ", "_"))
        summary = await client.get(f"{base}/api/rest_v1/page/summary/{path}")
        extract = summary.json().get("extract", "") if summary.status_code == 200 else ""
        articles.append(
            WikipediaArticle(
                url=f"{base}/wiki/{path}",
                title=title,
                language=language,
                summary=extract or _plain(str(hit.get("snippet") or "")),
            )
        )
    return articles


async def _safely(label: str, call: Any) -> list[Any] | None:
    """Le résultat de la recherche, ou None si elle n'a pas pu se faire (réseau, quota…)."""
    try:
        return await call
    except (httpx.HTTPError, ValueError) as error:
        logger.warning("Recherche %s impossible : %s", label, type(error).__name__)
        return None


async def find_fact_checks(
    settings: Settings, claim: str, *, transport: httpx.AsyncBaseTransport | None = None
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], bool]:
    """Vérifications publiées, articles Wikipédia, et si au moins une recherche a pu se faire."""
    if settings.demo_offline:
        return [], [], False
    query = " ".join(claim.split())[:QUERY_MAX_CHARS]
    # Wikipédia cherche par mots : une phrase entière y trouve des articles sans rapport.
    wiki_query = " ".join(keywords(claim, 2)) or query
    headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    async with httpx.AsyncClient(
        timeout=TIMEOUT_SECONDS, headers=headers, transport=transport, follow_redirects=True
    ) as client:
        calls: list[Any] = []
        if settings.google_factcheck_api_key is not None:
            key = settings.google_factcheck_api_key.get_secret_value()
            calls.append(_safely("Fact Check Tools", _claim_reviews(client, key, query)))
        if settings.tavily_api_key is not None:
            key = settings.tavily_api_key.get_secret_value()
            calls.append(_safely("vérificateurs", _fact_checker_pages(client, key, query)))
        wiki_calls = [
            _safely(f"Wikipédia {language}", _wikipedia(client, wiki_query, language))
            for language in WIKIPEDIA_LANGUAGES
        ]
        results = await asyncio.gather(*calls, *wiki_calls)

    checks: list[FactCheck] = [item for found in results[: len(calls)] for item in found or []]
    wiki: list[WikipediaArticle] = [item for found in results[len(calls) :] for item in found or []]
    # Une même page peut venir des deux sources : on garde la première (avec sa conclusion).
    seen: set[str] = set()
    unique = [check for check in checks if not (check.url in seen or seen.add(check.url))]
    searched = any(found is not None for found in results)
    return (
        [asdict(check) for check in unique[: MAX_REVIEWS * 2]],
        [asdict(article) for article in wiki],
        searched,
    )
