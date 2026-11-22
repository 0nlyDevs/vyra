import { ArrowLeft, Info } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/states/States';
import { AsideStrips } from '@/features/feed/AsideStrips';
import { arrangeFeed, topTrends } from '@/features/feed/arrange';
import { FeedLead } from '@/features/feed/FeedLead';
import { FeedLive } from '@/features/feed/FeedLive';
import { FeedRow } from '@/features/feed/FeedRow';
import { FeedStory } from '@/features/feed/FeedStory';
import { FEED_MAX_AGE_MS, isFeedStale } from '@/features/feed/harvest';
import { layoutFeed } from '@/features/feed/lead';
import { ProgressiveList } from '@/features/feed/ProgressiveList';
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

export const metadata = { title: 'Fil d’actualité' };

// Le fil d'actualité : ce qui circule vraiment (presse, télévisions, Facebook public, réseaux,
// recherches qui montent), d'abord dans la région choisie, puis dans le monde.
export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ vue?: string; sujet?: string }>;
}) {
  const region = await getFeedRegion();
  const header = (
    <PageHeader
      eyebrow={
        <span className="inline-flex items-center gap-2.5">
          <span aria-hidden className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-2 rounded-full bg-primary" />
          </span>
          En direct{region ? ` · ${FEED_REGION_LABELS[region]}` : ''}
        </span>
      }
      title="Fil d’actualité"
      description="Ce qui circule vraiment, officiel ou non, avec son état de vérification."
    />
  );
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
  const { lead, sides, rest } = layoutFeed(shown, feedStatusOf);
  const views: FeedView[] = region === 'world' ? ['all', 'unofficial', 'checked'] : [...FEED_VIEWS];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      {header}
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-label="Publications" className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5">
          {/* Une seule rangée de commandes : la région, la vue, l'actualisation. Elle défile de côté. */}
          <div className="flex min-w-0 items-center gap-2 max-sm:overflow-x-auto max-sm:[-ms-overflow-style:none] max-sm:[scrollbar-width:none] sm:flex-wrap max-sm:[&::-webkit-scrollbar]:hidden max-sm:[&>*]:shrink-0">
            <RegionSwitch current={region} />
            <nav
              aria-label="Filtrer le fil"
              className="flex gap-1 rounded-full bg-foreground/[0.05] p-1 shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--foreground)_6%,transparent)]"
            >
              {views.map((option) => (
                <Link
                  key={option}
                  href={option === 'all' ? '/feed' : `/feed?vue=${option}`}
                  aria-current={view === option ? 'page' : undefined}
                  className={cn(
                    'whitespace-nowrap rounded-full px-3.5 py-1.5 font-medium text-sm transition-colors',
                    view === option
                      ? 'bg-foreground/[0.1] text-foreground shadow-[inset_0_1px_0_var(--sheen)]'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {/* « Local » et « International » : pas les mots de la région juste à côté. */}
                  {option === 'local'
                    ? 'Local'
                    : option === 'world'
                      ? 'International'
                      : FEED_VIEW_LABELS[option]}
                </Link>
              ))}
            </nav>
            <div className="ml-auto max-sm:pl-2">
              <FeedLive stale={stale} empty={items.length === 0} lastHarvest={freshness.all} />
            </div>
          </div>
          {focus && (
            <div className="grid gap-2 rounded-[1.35rem] bg-primary/[0.07] p-5 shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--primary)_30%,transparent)]">
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
            <>
              {lead && (
                <FeedLead
                  item={lead}
                  status={feedStatusOf(lead)}
                  topic={focus ? undefined : byItem.get(lead.id)}
                />
              )}
              {sides.length > 0 && (
                <div className="-mx-4 flex max-w-[100vw] snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:max-w-none sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0">
                  {sides.map((item) => (
                    <FeedStory key={item.id} item={item} status={feedStatusOf(item)} />
                  ))}
                </div>
              )}
              <AsideStrips topics={topics.slice(0, 5)} trends={topTrends(items, 6)} />
              {rest.length > 0 && (
                <div className="grid gap-4">
                  <h2 className="font-semibold text-lg">
                    Le reste du fil
                    <span className="ml-2 font-normal text-muted-foreground text-sm tabular-nums">
                      {rest.length} publications
                    </span>
                  </h2>
                  <div className="grid px-4 surface sm:px-5">
                    <ProgressiveList initial={10} step={10}>
                      {rest.map((item) => (
                        <FeedRow
                          key={item.id}
                          item={item}
                          status={feedStatusOf(item)}
                          showWorld={region !== 'world'}
                        />
                      ))}
                    </ProgressiveList>
                  </div>
                </div>
              )}
              <p className="flex items-center gap-1.5 text-muted-foreground text-sm">
                <Info aria-hidden className="size-4 shrink-0" />
                Non vérifié ne veut pas dire faux : une publication sans pastille n’a simplement pas
                encore été examinée.
              </p>
            </>
          )}
        </section>
        <div className="hidden gap-4 lg:sticky lg:top-24 lg:grid">
          <TopicsColumn topics={topics.slice(0, 5)} />
          <TrendsColumn trends={topTrends(items, 6)} />
        </div>
      </div>
    </div>
  );
}
