import type { FeedItem } from '@/server/dal/feed';

// Sujets qui reviennent : des publications proches par le sens, venues de sources différentes
// (paires calculées en base). Un sujet repris par plusieurs sources est à vérifier en premier.

// Distance cosinus maximale entre deux publications du même sujet (0 = identique). Réglée le
// 21 novembre sur le vrai fil : en dessous de 0,22, la même affaire (Ruffin chez RFI, Mastodon et
// Google) ; au-dessus, des sujets seulement voisins.
export const TOPIC_MAX_DISTANCE = 0.22;
// Fenêtre où l'on cherche les reprises.
export const TOPIC_WINDOW_MS = 3 * 24 * 60 * 60_000;

export type FeedTopic = {
  id: string;
  label: string;
  // Nombre de sources différentes qui en parlent.
  sources: number;
  items: FeedItem[];
};

export function groupTopics(items: FeedItem[], pairs: readonly (readonly [string, string])[]) {
  const byId = new Map(items.map((item) => [item.id, item]));
  const parent = new Map<string, string>();
  const find = (id: string): string => {
    const up = parent.get(id) ?? id;
    if (up === id) return id;
    const root = find(up);
    parent.set(id, root);
    return root;
  };
  // Toutes les publications reliées, racines comprises (une racine n'a pas d'entrée dans `parent`).
  const linked = new Set<string>();
  for (const [a, b] of pairs) {
    if (!byId.has(a) || !byId.has(b)) continue;
    linked.add(a);
    linked.add(b);
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent.set(rootA, rootB);
  }

  const groups = new Map<string, FeedItem[]>();
  for (const id of linked) {
    const item = byId.get(id);
    if (!item) continue;
    const root = find(id);
    groups.set(root, [...(groups.get(root) ?? []), item]);
  }

  const topics: FeedTopic[] = [];
  const byItem = new Map<string, FeedTopic>();
  for (const members of groups.values()) {
    const sources = new Set(members.map((item) => item.sourceName)).size;
    // Des recherches Google seules (un match suivi dans trois pays) ne font pas un sujet à vérifier.
    if (sources < 2 || members.every((item) => item.kind === 'trend')) continue;
    members.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
    // Un titre de presse nomme mieux le sujet qu'un post : on le préfère.
    const named = members.find((item) => item.title && item.kind !== 'trend') ?? members[0];
    const topic = {
      id: members[0].id,
      label: named.title ?? named.body,
      sources,
      items: members,
    };
    topics.push(topic);
    for (const item of members) byItem.set(item.id, topic);
  }
  topics.sort(
    (a, b) =>
      b.sources - a.sources || b.items[0].publishedAt.getTime() - a.items[0].publishedAt.getTime(),
  );
  return { topics, byItem };
}
