import {
  ArrowRight,
  ArrowUpRight,
  Gavel,
  Globe,
  Layers,
  type LucideIcon,
  MessageCircle,
  Newspaper,
  ShieldCheck,
  Siren,
  TrendingUp,
  Tv,
  Users,
  Waypoints,
} from 'lucide-react';
import Link from 'next/link';
import { CertaintyBadge } from '@/components/common/DomainBadges';
import { ToneBadge } from '@/components/common/ToneBadge';
import { Button } from '@/components/ui/button';
import {
  FEED_KIND_LABELS,
  FEED_KIND_TONES,
  FEED_REACH_UNITS,
  FEED_STATUS_LABELS,
  FEED_STATUS_TONES,
  type FeedKind,
  type FeedStatus,
  REPORT_CASE_THRESHOLD,
} from '@/lib/domain';
import { formatRelative } from '@/lib/format';
import type { FeedItem } from '@/server/dal/feed';
import { openFromPost } from './actions';
import { FeedImage } from './FeedImage';

const KIND_ICONS = {
  press: Newspaper,
  tv: Tv,
  facebook: Users,
  social: MessageCircle,
  trend: TrendingUp,
  factcheck: ShieldCheck,
} satisfies Record<FeedKind, LucideIcon>;

const numbers = new Intl.NumberFormat('fr-FR');

function reachLabel(item: FeedItem) {
  const unit = FEED_REACH_UNITS[item.kind];
  if (!unit || !item.reach) return null;
  // Google Trends donne un seuil (« 1000+ ») et non un compte exact.
  const suffix = item.kind === 'trend' ? '+' : '';
  return `${numbers.format(item.reach)}${suffix} ${unit}`;
}

// Une publication réelle du fil : sa source, son texte, son état, et trois façons d'agir.
export function FeedCard({
  item,
  status,
  showWorld,
  topic,
}: {
  item: FeedItem;
  status: FeedStatus;
  // Dans le fil d'une région, on signale ce qui vient du reste du monde.
  showWorld: boolean;
  // Le sujet repris par plusieurs sources auquel elle appartient, s'il y en a un.
  topic?: { id: string; sources: number };
}) {
  const Icon = KIND_ICONS[item.kind];
  const reach = reachLabel(item);
  const reportHref = `/reports?post=${item.id}&text=${encodeURIComponent(
    (item.title ? `${item.title}. ${item.body}` : item.body).slice(0, 600),
  )}&url=${encodeURIComponent(item.url)}`;

  return (
    <article
      aria-labelledby={`post-${item.id}`}
      className="grid grid-cols-[minmax(0,1fr)] gap-4 rounded-2xl border bg-card p-5"
    >
      <header className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"
        >
          <Icon className="size-5" />
        </span>
        <div className="grid min-w-0 flex-1 gap-0.5 leading-tight">
          <p id={`post-${item.id}`} className="truncate font-medium">
            {item.sourceName}
            {item.author && (
              <span className="font-normal text-muted-foreground"> · {item.author}</span>
            )}
          </p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-sm">
            <ToneBadge tone={FEED_KIND_TONES[item.kind]}>{FEED_KIND_LABELS[item.kind]}</ToneBadge>
            {showWorld && item.region === 'world' && (
              <span className="inline-flex items-center gap-1">
                <Globe aria-hidden className="size-3.5" />
                Monde
              </span>
            )}
            <span suppressHydrationWarning>
              {item.kind === 'facebook' ? 'vu ' : ''}
              {formatRelative(item.publishedAt)}
            </span>
            {reach && <span className="tabular-nums">· {reach}</span>}
          </p>
        </div>
        <ToneBadge tone={FEED_STATUS_TONES[status]} className="shrink-0 text-sm">
          {FEED_STATUS_LABELS[status]}
          {status === 'reported' && (
            <span className="tabular-nums">
              {' '}
              · {item.reporterCount} sur {REPORT_CASE_THRESHOLD}
            </span>
          )}
        </ToneBadge>
      </header>

      <div className="grid gap-2">
        {item.title && (
          <h2 className="text-pretty font-semibold text-lg leading-snug">{item.title}</h2>
        )}
        <p className="line-clamp-6 whitespace-pre-line text-pretty leading-relaxed">{item.body}</p>
        {topic && (
          <Link
            href={`/feed?sujet=${topic.id}`}
            className="inline-flex items-center gap-1.5 justify-self-start font-medium text-primary text-sm underline-offset-4 hover:underline"
          >
            <Layers aria-hidden className="size-4" />
            Repris par {topic.sources} sources
          </Link>
        )}
      </div>

      {item.imageUrl && <FeedImage src={item.imageUrl} />}

      {status === 'concluded' && item.case?.certainty && (
        <div className="grid gap-2 rounded-xl bg-muted p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-sm">Conclusion du tribunal</span>
            <CertaintyBadge level={item.case.certainty} />
          </div>
          {item.case.conclusion && <p className="text-pretty">{item.case.conclusion}</p>}
          <Link
            href={`/court/${item.case.id}`}
            className="inline-flex items-center gap-1 justify-self-start text-primary text-sm underline-offset-4 hover:underline"
          >
            Voir l’audience
            <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t pt-4">
        <form action={openFromPost}>
          <input type="hidden" name="postId" value={item.id} />
          <input type="hidden" name="target" value="case" />
          <Button type="submit" variant="outline" size="sm">
            <Waypoints aria-hidden />
            Voir l’affaire
          </Button>
        </form>
        <form action={openFromPost}>
          <input type="hidden" name="postId" value={item.id} />
          <input type="hidden" name="target" value="court" />
          <Button type="submit" variant="outline" size="sm">
            <Gavel aria-hidden />
            Ouvrir le tribunal
          </Button>
        </form>
        <Button asChild variant="ghost" size="sm">
          <Link href={reportHref}>
            <Siren aria-hidden />
            Signaler
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="ml-auto">
          <a href={item.url} target="_blank" rel="noopener noreferrer">
            Source
            <ArrowUpRight aria-hidden />
            <span className="sr-only">(nouvel onglet)</span>
          </a>
        </Button>
      </div>
    </article>
  );
}
