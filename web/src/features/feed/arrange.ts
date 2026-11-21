import { type FeedRegion, type FeedView, UNOFFICIAL_FEED_KINDS } from '@/lib/domain';
import type { FeedItem } from '@/server/dal/feed';
import { feedStatusOf } from './status';

// Ce que montre le fil : la vue choisie, sans qu'une source n'écrase les autres, et pour une
// région, trois publications de la région pour une du monde.

const FEED_LENGTH = 60;
const LOCAL_PER_WORLD = 3;

// Publications gardées par source : plus pour le non officiel, plus rare et plus parlant.
function perSourceLimit(item: FeedItem, view: FeedView) {
  const base = view === 'all' ? 5 : 10;
  return UNOFFICIAL_FEED_KINDS.includes(item.kind) ? base + 3 : base;
}

function matches(item: FeedItem, region: FeedRegion, view: FeedView) {
  switch (view) {
    case 'local':
      return item.region === region;
    case 'world':
      return item.region === 'world';
    case 'unofficial':
      return UNOFFICIAL_FEED_KINDS.includes(item.kind);
    case 'checked': {
      const status = feedStatusOf(item);
      return status === 'verifying' || status === 'concluded';
    }
    default:
      return true;
  }
}

function capPerSource(items: FeedItem[], view: FeedView) {
  const counts = new Map<string, number>();
  return items.filter((item) => {
    const count = counts.get(item.sourceName) ?? 0;
    counts.set(item.sourceName, count + 1);
    return count < perSourceLimit(item, view);
  });
}

// Alterne les sources : à chaque tour, la publication suivante de chaque source, de la plus
// récente à la plus ancienne. Facebook, sans date précise, ne monopolise plus le haut du fil.
function interleave(items: FeedItem[]) {
  const bySource = new Map<string, FeedItem[]>();
  for (const item of items) {
    bySource.set(item.sourceName, [...(bySource.get(item.sourceName) ?? []), item]);
  }
  const queues = [...bySource.values()];
  const rounds = Math.max(0, ...queues.map((queue) => queue.length));
  const result: FeedItem[] = [];
  for (let round = 0; round < rounds; round++) {
    const layer = queues.flatMap((queue) => (queue[round] ? [queue[round]] : []));
    layer.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
    result.push(...layer);
  }
  return result;
}

// `items` : du plus récent au plus ancien.
export function arrangeFeed(items: FeedItem[], region: FeedRegion, view: FeedView) {
  const shown = capPerSource(
    items.filter((item) => matches(item, region, view)),
    view,
  );
  if (view !== 'all') return shown.slice(0, FEED_LENGTH);
  if (region === 'world') return interleave(shown).slice(0, FEED_LENGTH);

  const local = interleave(shown.filter((item) => item.region === region));
  const world = interleave(shown.filter((item) => item.region !== region));
  const mixed: FeedItem[] = [];
  let l = 0;
  let w = 0;
  while (mixed.length < FEED_LENGTH && (l < local.length || w < world.length)) {
    for (let k = 0; k < LOCAL_PER_WORLD && l < local.length; k++) mixed.push(local[l++]);
    if (w < world.length) mixed.push(world[w++]);
  }
  return mixed.slice(0, FEED_LENGTH);
}

// Les recherches qui montent le plus, tous pays confondus.
export function topTrends(items: FeedItem[], count: number) {
  return items
    .filter((item) => item.kind === 'trend')
    .sort((a, b) => (b.reach ?? 0) - (a.reach ?? 0))
    .slice(0, count);
}
