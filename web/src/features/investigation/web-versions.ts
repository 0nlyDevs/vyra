import 'server-only';
import { type ActionResult, fail, ok } from '@/lib/action-result';
import type { WebSearchStatus } from '@/lib/domain';
import { ERRORS } from '@/lib/errors';
import { getCaseFile } from '@/server/dal/cases';
import {
  getWebSearch,
  type LinkBetween,
  type OrderedVersion,
  saveWebSearch,
} from '@/server/dal/investigation';
import { embedTexts, findWebSources, type WebArticle } from '@/server/processing';
import { refreshNewsIndex, searchNewsIndex } from './news-index';
import { confirmSameInformation } from './same-information';
import { searchQueries } from './search-queries';
import { describeTree } from './tree-links';
import { significantWords, wordOverlap } from './word-match';

// Recherche web d'une affaire : les sources qui rapportent la même information deviennent des
// versions, reliées en arbre de propagation (qui reprend qui), avec démentis et contexte.

// Distance cosinus maximale entre l'information et un article (titre et extrait). Large : l'IA
// confirme ensuite chaque source, et une version dans une autre langue est plus loin.
const WEB_MAX_DISTANCE = 0.38;
// Sans IA : part et nombre minimal de mots de l'information retrouvés dans l'article.
const WEB_MIN_OVERLAP = 0.4;
const WEB_MIN_SHARED = 3;
// Pages examinées au plus (dans l'ordre des moteurs) : les quotas gratuits de l'IA (vecteurs,
// confirmations) ne suivent pas au-delà. Toutes celles qui passent les filtres vont dans l'arbre.
const MAX_CANDIDATES = 60;
const EMBED_BATCH = 50;
const CONTENT_MAX_LENGTH = 600;

export type WebSearchResult = {
  status: WebSearchStatus | 'prepared';
  kept: number;
  // Sources qui démentent l'information, selon l'IA : de futures pièces pour le tribunal.
  contradicting: number;
};

// Une seule recherche à la fois par affaire : si la page la relance pendant qu'elle tourne (page
// montée deux fois, deux onglets), on attend la même au lieu de payer une seconde recherche.
const running = new Map<string, Promise<ActionResult<WebSearchResult>>>();

export function searchWebVersions(caseId: string): Promise<ActionResult<WebSearchResult>> {
  const current = running.get(caseId);
  if (current) return current;
  const task = search(caseId).finally(() => running.delete(caseId));
  running.set(caseId, task);
  return task;
}

async function search(caseId: string): Promise<ActionResult<WebSearchResult>> {
  const file = await getCaseFile(caseId);
  if (!file) return fail(ERRORS.NOT_FOUND);

  const previous = await getWebSearch(caseId);
  if (previous) {
    return ok({
      status: previous.status,
      kept: previous.keptCount,
      contradicting: previous.contradictingCount,
    });
  }
  // Une affaire qui a déjà plusieurs versions a été préparée à la main (données de démo).
  const received = file.versions[0];
  if (file.versions.length !== 1 || !received) {
    return ok({ status: 'prepared', kept: 0, contradicting: 0 });
  }

  // D'autres formulations (faits clés, anglais, malgache, démenti), puis le web (Tavily) et la
  // mise à jour de l'index de presse en même temps.
  const queries = await searchQueries(file.claim);
  const [search] = await Promise.all([findWebSources(file.claim, queries), refreshNewsIndex()]);
  const webReached = search.ok && search.data.source !== 'fallback';
  const found = (webReached ? search.data.articles : []).slice(0, MAX_CANDIDATES);

  const vectors = await embedInBatches([file.claim, ...found.map(articleText)]);
  const claimVector = vectors?.[0] ?? null;
  const fromWeb = keepSameInformation(file.claim, found, vectors);
  const fromIndex = await searchNewsIndex(file.claim, claimVector);
  // Ni web ni index : on n'enregistre rien, la personne peut relancer.
  if (!webReached && fromIndex.length === 0) return fail(ERRORS.WEB_SEARCH_UNAVAILABLE);

  // Sans vecteurs (quota de l'IA épuisé), le tri par mots écarte les autres langues et les
  // reformulations : on soumet alors tous les candidats à l'IA, qui juge chacun.
  const prefiltered = vectors ? fromWeb : found;
  // À adresse égale, l'article de l'index l'emporte : il porte le nom du journal.
  const unique = [
    ...new Map([...prefiltered, ...fromIndex].map((item) => [item.url, item])).values(),
  ];
  // L'IA dit ce que chaque source rapporte par rapport à l'information : le même fait, un démenti,
  // ou le même sujet (contexte). Toutes vont dans l'arbre, sauf les sources sans rapport.
  const confirmations = await confirmSameInformation(file.claim, unique.map(articleText));
  // Ni vecteurs ni IA : le tri par mots, en dernier recours.
  const candidates = confirmations || vectors ? unique : [...fromWeb, ...fromIndex];
  const judged = candidates.flatMap((article, index) => {
    const confirmation = confirmations?.[index];
    if (confirmation?.relation === 'unrelated') return [];
    return [{ article, relation: confirmation?.relation ?? 'same', reason: confirmation?.reason }];
  });
  const contradicting = judged.filter((item) => item.relation === 'contradicts').length;
  const kept = judged.sort(
    (a, b) => dateValue(a.article.published_at) - dateValue(b.article.published_at),
  );

  // Les sources du plus ancien au plus récent, puis le texte reçu, au centre de la toile.
  const ordered: OrderedVersion[] = [
    ...kept.map(({ article }) => ({
      content: articleText(article),
      sourceName: article.site,
      sourceUrl: article.url,
      publishedAt: article.published_at ? new Date(article.published_at) : null,
    })),
    { id: received.id },
  ];
  // L'arbre : qui reprend qui parmi les sources et le texte reçu, puis démentis et contexte.
  const receivedKey = 'received';
  const treeLinks = await describeTree([
    ...kept.map(({ article, relation, reason }, index) => ({
      key: String(index),
      relation,
      text: articleText(article),
      body: article.body,
      url: article.url,
      site: article.site,
      links: article.links,
      time: article.published_at ? Date.parse(article.published_at) : null,
      reason,
    })),
    {
      key: receivedKey,
      relation: 'same',
      text: received.content,
      body: '',
      url: received.sourceUrl,
      site: received.sourceName,
      links: [],
      time: received.publishedAt?.getTime() ?? Date.now(),
    },
  ]);
  const indexOf = (key: string) => (key === receivedKey ? kept.length : Number(key));
  const links: LinkBetween[] = treeLinks.map((link) => ({
    from: indexOf(link.from),
    to: indexOf(link.to),
    changeType: link.changeType,
    note: link.note,
    confidence: link.confidence,
  }));

  const status = kept.length > 0 ? 'found' : 'nothing_found';
  await saveWebSearch({
    caseId,
    status,
    foundCount: found.length + fromIndex.length,
    contradictingCount: contradicting,
    ordered,
    links,
  });
  return ok({ status, kept: kept.length, contradicting });
}

// Garde les articles qui disent la même chose : par le sens si l'IA a donné les vecteurs
// (le premier est celui de l'information), sinon par mots.
function keepSameInformation(
  claim: string,
  articles: WebArticle[],
  vectors: number[][] | null,
): WebArticle[] {
  const [claimVector, ...articleVectors] = vectors ?? [];
  if (claimVector) {
    return articles.filter((_, index) => {
      const vector = articleVectors[index];
      return vector !== undefined && cosineDistance(claimVector, vector) <= WEB_MAX_DISTANCE;
    });
  }
  const claimWords = significantWords(claim);
  return articles.filter((article) => {
    const overlap = wordOverlap(claimWords, significantWords(articleText(article)));
    return overlap.ratio >= WEB_MIN_OVERLAP && overlap.shared >= WEB_MIN_SHARED;
  });
}

// Les vecteurs de tous les textes, par paquets ; `null` si un paquet échoue (quota, hors ligne).
async function embedInBatches(texts: string[]) {
  const vectors: number[][] = [];
  for (let start = 0; start < texts.length; start += EMBED_BATCH) {
    const batch = await embedTexts(texts.slice(start, start + EMBED_BATCH));
    if (!batch.ok) return null;
    vectors.push(...batch.data);
  }
  return vectors;
}

function articleText(article: WebArticle) {
  const text = article.excerpt ? `${article.title}. ${article.excerpt}` : article.title;
  return text.length > CONTENT_MAX_LENGTH ? `${text.slice(0, CONTENT_MAX_LENGTH)}…` : text;
}

// Sans date, l'article passe après ceux qui en ont une.
function dateValue(iso: string | null) {
  const time = iso ? Date.parse(iso) : Number.NaN;
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
}

function cosineDistance(a: number[], b: number[]) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < a.length; index += 1) {
    const x = a[index] ?? 0;
    const y = b[index] ?? 0;
    dot += x * y;
    normA += x * x;
    normB += y * y;
  }
  return normA && normB ? 1 - dot / Math.sqrt(normA * normB) : 1;
}
