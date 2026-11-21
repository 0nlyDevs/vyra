import 'server-only';
import { type ActionResult, fail, ok } from '@/lib/action-result';
import { ERRORS } from '@/lib/errors';
import {
  addNewsArticles,
  findNewsByMeaning,
  getNewsIndexState,
  listKnownNewsUrls,
  listNewsWithoutEmbedding,
  listRecentNews,
  setNewsEmbeddings,
  touchNewsHarvest,
} from '@/server/dal/news-index';
import { embedTexts, readNewsFeeds, type WebArticle } from '@/server/processing';
import { NEWS_FEEDS } from './news-sources';
import { significantWords, wordOverlap } from './word-match';

// L'index de presse : on récolte les flux RSS au plus une fois par heure (ou sur demande), puis
// on y cherche les articles qui rapportent une information, sans réseau.

const HARVEST_MAX_AGE_MS = 60 * 60 * 1000;
// Petits paquets : avec une clé Gemini gratuite, chaque texte compte comme une requête dans le
// quota par minute.
const EMBED_BATCH = 40;
const EMBED_PER_HARVEST = 240;
const INDEX_MAX_DISTANCE = 0.3;
const INDEX_LIMIT = 6;
const WORDS_SCAN = 400;
const WORDS_MIN_OVERLAP = 0.4;
const WORDS_MIN_SHARED = 3;

export type HarvestResult = { added: number; embedded: number; total: number; feedsRead: number };

export async function refreshNewsIndex(force = false): Promise<ActionResult<HarvestResult>> {
  const state = await getNewsIndexState();
  const fresh = state.lastHarvest && Date.now() - state.lastHarvest.getTime() < HARVEST_MAX_AGE_MS;
  if (fresh && !force) {
    // Rien à récolter : on rattrape quand même quelques vecteurs manquants.
    const embedded = await embedMissingNews(EMBED_BATCH);
    return ok({ added: 0, embedded, total: state.total, feedsRead: 0 });
  }

  const feeds = await readNewsFeeds(NEWS_FEEDS.map((feed) => ({ ...feed })));
  if (!feeds.ok || feeds.data.feeds_read === 0) return fail(ERRORS.WEB_SEARCH_UNAVAILABLE);

  const byUrl = new Map(feeds.data.items.map((item) => [item.url, item]));
  const known = await listKnownNewsUrls([...byUrl.keys()]);
  const added = [...byUrl.values()].filter((item) => !known.has(item.url));

  // Les articles d'abord, les vecteurs ensuite : un refus de l'IA ne fait rien perdre.
  await addNewsArticles(
    added.map((item) => ({
      url: item.url,
      title: item.title,
      summary: item.summary,
      sourceName: item.source_name,
      publishedAt: item.published_at ? new Date(item.published_at) : null,
    })),
  );
  if (added.length === 0) await touchNewsHarvest();
  const embedded = await embedMissingNews(EMBED_PER_HARVEST);
  return ok({
    added: added.length,
    embedded,
    total: state.total + added.length,
    feedsRead: feeds.data.feeds_read,
  });
}

// Calcule les vecteurs manquants, par paquets, en s'arrêtant au premier refus de l'IA (quota
// gratuit dépassé) : le reste attend la prochaine récolte. Renvoie le nombre de vecteurs ajoutés.
async function embedMissingNews(limit: number) {
  const missing = await listNewsWithoutEmbedding(limit);
  let embedded = 0;
  for (let start = 0; start < missing.length; start += EMBED_BATCH) {
    const batch = missing.slice(start, start + EMBED_BATCH);
    const vectors = await embedTexts(batch.map((item) => `${item.title}\n${item.summary}`));
    if (!vectors.ok) break;
    const items = batch.flatMap((item, index) => {
      const embedding = vectors.data[index];
      return embedding ? [{ id: item.id, embedding }] : [];
    });
    await setNewsEmbeddings(items);
    embedded += items.length;
  }
  return embedded;
}

// Les articles de l'index qui rapportent l'information : par le sens, sinon par mots.
export async function searchNewsIndex(
  claim: string,
  claimVector: number[] | null,
): Promise<WebArticle[]> {
  if (claimVector) {
    const found = await findNewsByMeaning(claimVector, INDEX_LIMIT);
    return found.filter((item) => item.distance <= INDEX_MAX_DISTANCE).map(toArticle);
  }
  const claimWords = significantWords(claim);
  const recent = await listRecentNews(WORDS_SCAN);
  return recent
    .filter((item) => {
      const overlap = wordOverlap(claimWords, significantWords(`${item.title} ${item.summary}`));
      return overlap.ratio >= WORDS_MIN_OVERLAP && overlap.shared >= WORDS_MIN_SHARED;
    })
    .slice(0, INDEX_LIMIT)
    .map(toArticle);
}

function toArticle(item: {
  url: string;
  title: string;
  summary: string;
  sourceName: string;
  publishedAt: Date | null;
}): WebArticle {
  return {
    url: item.url,
    title: item.title,
    site: item.sourceName,
    published_at: item.publishedAt?.toISOString() ?? null,
    excerpt: item.summary,
    language: null,
    // L'index ne garde que le résumé : la comparaison se fait dessus.
    body: '',
    links: [],
  };
}
