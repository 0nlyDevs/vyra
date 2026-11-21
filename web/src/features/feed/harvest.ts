import 'server-only';
import { type ActionResult, fail, ok } from '@/lib/action-result';
import { ERRORS } from '@/lib/errors';
import {
  getFeedFreshness,
  listFeedPostsWithoutEmbedding,
  type NewFeedPost,
  pruneFeedPosts,
  setFeedEmbeddings,
  upsertFeedPosts,
} from '@/server/dal/feed';
import { embedTexts, type LiveItem, readLiveFeed } from '@/server/processing';
import { FEED_SOURCES, sourceByName } from './sources';

// Récolte du fil : on relit les sources au plus toutes les 10 minutes (à la visite du fil, ou
// avec le bouton). Facebook passe par Tavily, payé en crédits : au plus une fois par heure, et
// jamais deux fois en 10 minutes même sur demande.

export const HARVEST_EVERY_MS = 10 * 60_000;
const FACEBOOK_EVERY_MS = 60 * 60_000;
const FACEBOOK_FORCED_EVERY_MS = 10 * 60_000;
// Une publication plus ancienne n'entre pas dans le fil.
export const FEED_MAX_AGE_MS = 7 * 24 * 60 * 60_000;
// Une publication que plus aucune source ne montre depuis 3 jours est oubliée (sauf affaire).
const FORGET_AFTER_MS = 3 * 24 * 60 * 60_000;
// Sens des publications (sujets qui reviennent) : par paquets, car avec une clé Gemini gratuite
// chaque texte compte dans le quota par minute. On s'arrête au premier refus.
const EMBED_BATCH = 40;
const EMBED_PER_HARVEST = 120;

export type HarvestOutcome = { ran: boolean; added: number; sourcesRead: number };

// Une seule récolte à la fois, même si plusieurs onglets la demandent.
const state = globalThis as typeof globalThis & {
  feedHarvest?: Promise<ActionResult<HarvestOutcome>>;
};

export function refreshFeed(force = false): Promise<ActionResult<HarvestOutcome>> {
  state.feedHarvest ??= harvest(force).finally(() => {
    state.feedHarvest = undefined;
  });
  return state.feedHarvest;
}

export async function isFeedStale() {
  const freshness = await getFeedFreshness();
  return !freshness.all || Date.now() - freshness.all.getTime() >= HARVEST_EVERY_MS;
}

async function harvest(force: boolean): Promise<ActionResult<HarvestOutcome>> {
  const now = Date.now();
  const freshness = await getFeedFreshness();
  const age = (date: Date | null) => (date ? now - date.getTime() : Number.POSITIVE_INFINITY);
  if (!force && age(freshness.all) < HARVEST_EVERY_MS) {
    // Rien à relire : on rattrape quand même quelques sens manquants.
    await embedMissing(now, EMBED_BATCH);
    return ok({ ran: false, added: 0, sourcesRead: 0 });
  }
  const facebookDue =
    age(freshness.facebook) >= (force ? FACEBOOK_FORCED_EVERY_MS : FACEBOOK_EVERY_MS);
  const sources = FEED_SOURCES.filter((source) => source.type !== 'facebook' || facebookDue);

  const result = await readLiveFeed(
    sources.map(({ type, target, name }) => ({ type, target, name })),
  );
  if (!result.ok || result.data.sources_read === 0) return fail(ERRORS.WEB_SEARCH_UNAVAILABLE);

  // Une même adresse peut revenir deux fois (deux recherches Facebook) : on n'en garde qu'une.
  const rows = new Map<string, NewFeedPost>();
  for (const item of result.data.items) {
    const row = toRow(item, now);
    if (row && !rows.has(row.url)) rows.set(row.url, row);
  }
  const added = await upsertFeedPosts([...rows.values()]);
  await pruneFeedPosts(new Date(now - FORGET_AFTER_MS));
  await embedMissing(now, EMBED_PER_HARVEST);
  return ok({ ran: true, added, sourcesRead: result.data.sources_read });
}

async function embedMissing(now: number, limit: number) {
  const missing = await listFeedPostsWithoutEmbedding(new Date(now - FEED_MAX_AGE_MS), limit);
  for (let start = 0; start < missing.length; start += EMBED_BATCH) {
    const batch = missing.slice(start, start + EMBED_BATCH);
    const vectors = await embedTexts(
      batch.map((post) => (post.title ? `${post.title}\n${post.body}` : post.body).slice(0, 1000)),
    );
    if (!vectors.ok) return;
    await setFeedEmbeddings(
      batch.flatMap((post, index) => {
        const embedding = vectors.data[index];
        return embedding ? [{ id: post.id, embedding }] : [];
      }),
    );
  }
}

function toRow(item: LiveItem, now: number): NewFeedPost | null {
  const source = sourceByName(item.source_name);
  if (!source) return null;
  const published = item.published_at ? new Date(item.published_at) : null;
  // Sans date (Facebook) : la date où on l'a vue. Une date future est ramenée à maintenant.
  const publishedAt =
    published && !Number.isNaN(published.getTime())
      ? new Date(Math.min(published.getTime(), now))
      : new Date(now);
  if (now - publishedAt.getTime() > FEED_MAX_AGE_MS) return null;
  const title = item.title?.trim() || null;
  const body = item.text.trim() || title;
  if (!body) return null;
  return {
    url: item.url,
    kind: source.kind,
    region: source.region,
    sourceName: source.name,
    author: item.author,
    title: title === body ? null : title,
    body,
    imageUrl: item.image_url,
    reach: item.reach,
    publishedAt,
  };
}
