import type { FeedStatus } from '@/lib/domain';
import type { FeedItem } from '@/server/dal/feed';

// La une d'un fil : parmi les premières publications, celle qui mérite le plus d'être vue d'abord
// (signalée ou en vérification, avec une image), puis trois histoires secondaires, puis le reste
// dans l'ordre du fil. Une affaire déjà conclue passe après : elle est réglée.
const LOOKAHEAD = 16;
const SIDE_STORIES = 3;

const STATUS_WEIGHT: Record<FeedStatus, number> = {
  reported: 3,
  verifying: 2,
  unverified: 1,
  concluded: 0,
};

function score(item: FeedItem, status: FeedStatus) {
  return STATUS_WEIGHT[status] + (item.imageUrl ? 2.5 : 0);
}

export function layoutFeed(items: FeedItem[], statusOf: (item: FeedItem) => FeedStatus) {
  const pool = items.slice(0, LOOKAHEAD);
  // Le meilleur score gagne ; à égalité, la publication la plus haute dans le fil.
  const ranked = pool
    .map((item, index) => ({ item, index, value: score(item, statusOf(item)) }))
    .sort((a, b) => b.value - a.value || a.index - b.index);
  const lead = ranked[0]?.item ?? null;
  const sides = ranked
    .slice(1, 1 + SIDE_STORIES)
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.item);
  const taken = new Set([lead, ...sides]);
  return { lead, sides, rest: items.filter((item) => !taken.has(item)) };
}
