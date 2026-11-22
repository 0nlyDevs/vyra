import { arrangeFeed, topTrends } from '@/features/feed/arrange';
import { FEED_MAX_AGE_MS } from '@/features/feed/harvest';
import { layoutFeed } from '@/features/feed/lead';
import { feedRegionSchema, feedTopicSchema, feedViewSchema } from '@/features/feed/schema';
import { feedStatusOf } from '@/features/feed/status';
import { groupTopics, TOPIC_MAX_DISTANCE, TOPIC_WINDOW_MS } from '@/features/feed/topics';
import { FEED_VIEWS, type FeedView } from '@/lib/domain';
import { apiFail, apiOk, requireApiProfile } from '@/server/api';
import { type FeedItem, listFeedItems, listFeedPairs } from '@/server/dal/feed';

// Le fil d'actualité, rangé comme la page /feed : `?region=mg|world` (Madagascar et monde, par
// défaut), `?vue=all|local|world|unofficial|checked`, `?sujet=<id>` (un sujet repris seul).
// Renvoie la une (`lead`), les trois histoires (`sides`), le reste, les sujets repris et les
// recherches qui montent ; chaque publication porte son état (`status`) et son sujet (`topic`).
export async function GET(request: Request) {
  const auth = await requireApiProfile();
  if ('response' in auth) return auth.response;
  const search = new URL(request.url).searchParams;
  const region = feedRegionSchema.safeParse(search.get('region') ?? 'mg');
  if (!region.success) return apiFail('VALIDATION_FAILED', { region: ['« mg » ou « world »'] });
  const view = feedViewSchema.parse(search.get('vue') ?? undefined);
  const regions = region.data === 'world' ? (['world'] as const) : (['mg', 'world'] as const);
  const now = Date.now();
  const [items, pairs] = await Promise.all([
    listFeedItems([...regions], new Date(now - FEED_MAX_AGE_MS)),
    listFeedPairs([...regions], new Date(now - TOPIC_WINDOW_MS), TOPIC_MAX_DISTANCE),
  ]);
  const { topics, byItem } = groupTopics(items, pairs);
  const focus = byItem.get(feedTopicSchema.parse(search.get('sujet') ?? undefined) ?? '') ?? null;
  const shown = focus ? focus.items : arrangeFeed(items, region.data, view);
  const { lead, sides, rest } = layoutFeed(shown, feedStatusOf);
  const withStatus = (item: FeedItem) => {
    const topic = byItem.get(item.id);
    return {
      ...item,
      status: feedStatusOf(item),
      topic: topic ? { id: topic.id, label: topic.label, sources: topic.sources } : null,
    };
  };
  // Dans le fil Monde, « Madagascar » et « Monde » feraient double emploi (comme sur le site).
  const views: FeedView[] =
    region.data === 'world' ? ['all', 'unofficial', 'checked'] : [...FEED_VIEWS];

  return apiOk({
    region: region.data,
    view,
    views,
    focus: focus ? { id: focus.id, label: focus.label, sources: focus.sources } : null,
    lead: lead ? withStatus(lead) : null,
    sides: sides.map(withStatus),
    rest: rest.map(withStatus),
    // Tout le fil affiché, dans l'ordre (pour les anciennes versions de l'application).
    items: shown.map(withStatus),
    topics: topics.slice(0, 5).map(({ id, label, sources }) => ({ id, label, sources })),
    trends: topTrends(items, 6).map(withStatus),
    empty: items.length === 0,
  });
}
