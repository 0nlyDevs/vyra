import { ArrowUpRight, Ellipsis, Siren } from 'lucide-react';
import Link from 'next/link';
import type { FeedStatus } from '@/lib/domain';
import { formatRelative } from '@/lib/format';
import type { FeedItem } from '@/server/dal/feed';
import { FeedImage } from './FeedImage';
import { FeedStatusMark } from './FeedStatusMark';
import { headlineOf, KIND_ICONS, reachLabel, reportHrefOf } from './meta';
import { OpenPostForm, OpenPostMenuItem } from './OpenPostForms';

// Une ligne du fil : une vignette à largeur fixe (le texte part toujours du même bord), la source et
// l'heure, le titre sur deux lignes au plus, l'état s'il y en a un. Une action visible, le reste
// dans un menu : une ligne n'est pas une carte.
export function FeedRow({
  item,
  status,
  showWorld,
}: {
  item: FeedItem;
  status: FeedStatus;
  showWorld: boolean;
}) {
  const Icon = KIND_ICONS[item.kind];
  const reach = reachLabel(item);
  return (
    <article
      aria-labelledby={`post-${item.id}`}
      className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-x-3.5 gap-y-2 border-b py-4 last:border-b-0 sm:grid-cols-[7rem_minmax(0,1fr)_auto] sm:items-center"
    >
      <div className="row-span-2 overflow-hidden rounded-lg sm:row-span-1">
        {item.imageUrl ? (
          <FeedImage src={item.imageUrl} className="aspect-[4/3] rounded-lg border-0" />
        ) : (
          <div className="grid aspect-[4/3] place-items-center rounded-lg bg-raised text-muted-foreground">
            <Icon aria-hidden className="size-6" />
          </div>
        )}
      </div>
      <div className="grid min-w-0 content-center gap-1">
        <p className="truncate text-muted-foreground text-sm">
          <span className="font-medium text-foreground">{item.sourceName}</span>
          {showWorld && item.region === 'world' && <span> · Monde</span>}
          <span aria-hidden> · </span>
          <span suppressHydrationWarning>{formatRelative(item.publishedAt)}</span>
          {reach && <span className="tabular-nums"> · {reach}</span>}
        </p>
        <h3
          id={`post-${item.id}`}
          className="line-clamp-2 text-pretty font-medium text-[1.02rem] leading-snug"
        >
          {headlineOf(item)}
        </h3>
        <FeedStatusMark item={item} status={status} />
      </div>
      <div className="col-span-2 flex items-center justify-end gap-1 sm:col-span-1">
        <OpenPostForm postId={item.id} target="case" variant="ghost" />
        <details className="group/menu relative">
          <summary
            aria-label="Plus d’actions"
            className="grid size-9 cursor-pointer list-none place-items-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground [&::-webkit-details-marker]:hidden"
          >
            <Ellipsis aria-hidden className="size-5" />
          </summary>
          <div className="absolute right-0 z-20 mt-1 grid w-52 gap-0.5 rounded-xl border bg-popover p-1.5 shadow-lg">
            <OpenPostMenuItem postId={item.id} target="court" />
            <Link
              href={reportHrefOf(item)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-foreground/[0.06]"
            >
              <Siren aria-hidden className="size-4 text-muted-foreground" />
              Signaler
            </Link>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-foreground/[0.06]"
            >
              <ArrowUpRight aria-hidden className="size-4 text-muted-foreground" />
              Source
              <span className="sr-only">(nouvel onglet)</span>
            </a>
          </div>
        </details>
      </div>
    </article>
  );
}
