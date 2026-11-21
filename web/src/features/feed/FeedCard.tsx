import { ArrowRight, Gavel, Siren, Waypoints } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { CertaintyBadge } from '@/components/common/DomainBadges';
import { ToneBadge } from '@/components/common/ToneBadge';
import { Button } from '@/components/ui/button';
import {
  FEED_STATUS_LABELS,
  FEED_STATUS_TONES,
  type FeedStatus,
  REPORT_CASE_THRESHOLD,
} from '@/lib/domain';
import { formatRelative } from '@/lib/format';
import type { FeedItem } from '@/server/dal/feed';
import { openFromPost } from './actions';

// Une publication du fil : sa source, son texte, son état, et trois façons d'agir.
export function FeedCard({ item, status }: { item: FeedItem; status: FeedStatus }) {
  const initial = item.sourceName.match(/[\p{L}\p{N}]/u)?.[0]?.toUpperCase() ?? '?';
  const reportHref = `/reports?post=${item.id}&text=${encodeURIComponent(item.body)}`;

  return (
    <article
      aria-labelledby={`post-${item.id}`}
      className="grid gap-4 rounded-2xl border bg-card p-5"
    >
      <header className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted font-semibold"
        >
          {initial}
        </span>
        <div className="grid min-w-0 flex-1 leading-tight">
          <p id={`post-${item.id}`} className="truncate font-medium">
            {item.sourceName}
          </p>
          <p className="text-muted-foreground text-sm" suppressHydrationWarning>
            {formatRelative(item.publishedAt)}
          </p>
        </div>
        <ToneBadge tone={FEED_STATUS_TONES[status]} className="text-sm">
          {FEED_STATUS_LABELS[status]}
          {status === 'reported' && (
            <span className="tabular-nums">
              {' '}
              · {item.reporterCount} sur {REPORT_CASE_THRESHOLD}
            </span>
          )}
        </ToneBadge>
      </header>

      <p className="text-pretty text-lg leading-relaxed">{item.body}</p>

      {item.imagePath && (
        <Image
          src={item.imagePath}
          alt="Image jointe à la publication"
          width={1200}
          height={800}
          className="max-h-80 w-full rounded-xl border object-cover"
        />
      )}

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

      <div className="flex flex-wrap gap-2 border-t pt-4">
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
      </div>
    </article>
  );
}
