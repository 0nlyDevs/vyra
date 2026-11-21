import { ArrowLeft, Info } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/states/States';
import { arrangeFeed, topTrends } from '@/features/feed/arrange';
import { FeedCard } from '@/features/feed/FeedCard';
import { FeedLive } from '@/features/feed/FeedLive';
import { FEED_MAX_AGE_MS, isFeedStale } from '@/features/feed/harvest';
import { RegionChooser, RegionSwitch } from '@/features/feed/RegionPicker';
import { getFeedRegion } from '@/features/feed/region';
import { feedTopicSchema, feedViewSchema } from '@/features/feed/schema';
import { feedStatusOf } from '@/features/feed/status';
import { TopicsColumn } from '@/features/feed/TopicsColumn';
import { TrendsColumn } from '@/features/feed/TrendsColumn';
import { groupTopics, TOPIC_MAX_DISTANCE, TOPIC_WINDOW_MS } from '@/features/feed/topics';
import {
  FEED_REGION_LABELS,
  FEED_VIEW_LABELS,
  FEED_VIEWS,
  type FeedRegion,
  type FeedView,
} from '@/lib/domain';
import { cn } from '@/lib/utils';
import { getFeedFreshness, listFeedItems, listFeedPairs } from '@/server/dal/feed';

// Le fil d'actualité : ce qui circule vraiment (presse, télévisions, Facebook public, réseaux,
// recherches qui montent), d'abord dans la région choisie, puis dans le monde.
export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ vue?: string; sujet?: string }>;
}) {
  const header = (
    <PageHeader
      eyebrow="Module 1"
      title="Fil d’actualité"
      description="Ce qui circule vraiment, officiel ou non, avec son état de vérification."
    />
  );
  const region = await getFeedRegion();
  if (!region) {
    return (
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
        {header}
        <RegionChooser />
      </div>
    );
  }

  const params = await searchParams;
  const view = feedViewSchema.parse(params.vue);
  const regions: FeedRegion[] = region === 'world' ? ['world'] : ['mg', 'world'];
  // La page se calcule à chaque visite : l'heure du serveur fixe la fenêtre des 7 derniers jours.
  const now = Date.now();
  const [items, freshness, stale, pairs] = await Promise.all([
    listFeedItems(regions, new Date(now - FEED_MAX_AGE_MS)),
    getFeedFreshness(),
    isFeedStale(),
    listFeedPairs(regions, new Date(now - TOPIC_WINDOW_MS), TOPIC_MAX_DISTANCE),
  ]);
  const { topics, byItem } = groupTopics(items, pairs);
  // `?sujet=` : seulement les publications d'un sujet repris, toutes sources confondues.
  const focus = byItem.get(feedTopicSchema.parse(params.sujet) ?? '') ?? null;
  const shown = focus ? focus.items : arrangeFeed(items, region, view);
  // Dans le fil Monde, « Madagascar » et « Monde » feraient double emploi.
  const views: FeedView[] = region === 'world' ? ['all', 'unofficial', 'checked'] : [...FEED_VIEWS];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      {header}
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-label="Publications" className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <RegionSwitch current={region} />
            <FeedLive stale={stale} empty={items.length === 0} lastHarvest={freshness.all} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <nav
              aria-label="Filtrer le fil"
              className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-muted p-1"
            >
              {views.map((option) => (
                <Link
                  key={option}
                  href={option === 'all' ? '/feed' : `/feed?vue=${option}`}
                  aria-current={view === option ? 'page' : undefined}
                  className={cn(
                    'whitespace-nowrap rounded-lg px-3 py-1.5 font-medium text-sm transition-colors',
                    view === option
                      ? 'bg-card text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {option === 'local' ? FEED_REGION_LABELS[region] : FEED_VIEW_LABELS[option]}
                </Link>
              ))}
            </nav>
            <p className="flex items-center gap-1.5 text-muted-foreground text-sm">
              <Info aria-hidden className="size-4" />
              Non vérifié ne veut pas dire faux.
            </p>
          </div>
          {focus && (
            <div className="grid gap-2 rounded-2xl border border-primary/30 bg-primary/5 p-4">
              <p className="font-medium">
                Sujet repris par {focus.sources} sources : {focus.label}
              </p>
              <Link
                href="/feed"
                className="inline-flex items-center gap-1 justify-self-start text-primary text-sm underline-offset-4 hover:underline"
              >
                <ArrowLeft aria-hidden className="size-3.5" />
                Retour au fil
              </Link>
            </div>
          )}
          {shown.length === 0 ? (
            <EmptyState
              title={
                items.length === 0
                  ? 'Première lecture des sources en cours…'
                  : 'Aucune publication dans cette vue.'
              }
              description={
                items.length === 0
                  ? 'Les publications apparaissent ici dès que les sources ont répondu.'
                  : 'Revenez à « Tout » pour en choisir une à vérifier.'
              }
            />
          ) : (
            shown.map((item) => (
              <FeedCard
                key={item.id}
                item={item}
                status={feedStatusOf(item)}
                showWorld={region !== 'world'}
                topic={focus ? undefined : byItem.get(item.id)}
              />
            ))
          )}
        </section>
        <div className="grid gap-4 lg:sticky lg:top-24">
          <TopicsColumn topics={topics.slice(0, 5)} />
          <TrendsColumn trends={topTrends(items, 6)} />
        </div>
      </div>
    </div>
  );
}
