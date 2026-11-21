import { Info } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/states/States';
import { FeedCard } from '@/features/feed/FeedCard';
import { PressColumn } from '@/features/feed/PressColumn';
import { feedViewSchema } from '@/features/feed/schema';
import { feedStatusOf, matchesView } from '@/features/feed/status';
import { FEED_VIEW_LABELS, FEED_VIEWS } from '@/lib/domain';
import { cn } from '@/lib/utils';
import { listFeedItems } from '@/server/dal/feed';
import { listRecentNews } from '@/server/dal/news-index';

// Le fil d'actualité : là où l'on rencontre une information, et où sa conclusion revient.
export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ vue?: string }>;
}) {
  const view = feedViewSchema.parse((await searchParams).vue);
  const [items, press] = await Promise.all([listFeedItems(), listRecentNews(6)]);
  const withStatus = items.map((item) => ({ item, status: feedStatusOf(item) }));
  const shown = withStatus.filter(({ status }) => matchesView(status, view));

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Module 1"
        title="Fil d’actualité"
        description="Les informations qui circulent, avec leur état de vérification."
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-label="Publications" className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <nav aria-label="Filtrer le fil" className="flex gap-1 rounded-xl bg-muted p-1">
              {FEED_VIEWS.map((option) => (
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
                  {FEED_VIEW_LABELS[option]}
                </Link>
              ))}
            </nav>
            <p className="flex items-center gap-1.5 text-muted-foreground text-sm">
              <Info aria-hidden className="size-4" />
              Non vérifié ne veut pas dire faux.
            </p>
          </div>
          {shown.length === 0 ? (
            <EmptyState
              title="Aucune publication dans cette vue."
              description="Revenez à toutes les publications pour en choisir une à vérifier."
            />
          ) : (
            shown.map(({ item, status }) => <FeedCard key={item.id} item={item} status={status} />)
          )}
        </section>
        <div className="lg:sticky lg:top-24">
          <PressColumn items={press} />
        </div>
      </div>
    </div>
  );
}
