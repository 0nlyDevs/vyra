import { ArrowUpRight, Layers } from 'lucide-react';
import Link from 'next/link';
import type { FeedStatus } from '@/lib/domain';
import { FEED_KIND_LABELS } from '@/lib/domain';
import { formatRelative } from '@/lib/format';
import type { FeedItem } from '@/server/dal/feed';
import { FeedImage } from './FeedImage';
import { FeedStatusMark } from './FeedStatusMark';
import { headlineOf, KIND_ICONS, reachLabel } from './meta';
import { OpenPostForm } from './OpenPostForms';

// La une du fil : la publication qui mérite d'être vue d'abord, en grand. L'image à gauche sur un
// grand écran, au-dessus sur un téléphone ; le titre est ce qui se lit en premier.
export function FeedLead({
  item,
  status,
  topic,
}: {
  item: FeedItem;
  status: FeedStatus;
  topic?: { id: string; sources: number };
}) {
  const Icon = KIND_ICONS[item.kind];
  const reach = reachLabel(item);
  const hasImage = Boolean(item.imageUrl);
  return (
    // Le conteneur dit la largeur réelle de la colonne : l'image passe à côté du texte seulement
    // quand il y a la place (pas à côté de la colonne des sujets, où le titre déborderait).
    <div className="@container">
      <article
        aria-labelledby={`post-${item.id}`}
        className={`group/lead grid overflow-hidden surface ${
          hasImage ? '@4xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]' : ''
        }`}
      >
        {item.imageUrl && (
          <div className="overflow-hidden">
            <FeedImage
              src={item.imageUrl}
              className="aspect-[16/9] max-h-64 rounded-none border-0 transition-transform duration-700 ease-out-strong group-hover/lead:scale-[1.03] @4xl:aspect-auto @4xl:h-full @4xl:max-h-none @4xl:min-h-[20rem]"
            />
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-3.5 p-5 @4xl:p-7">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-sm">
            <Icon aria-hidden className="size-4" />
            <span className="font-medium text-foreground">{item.sourceName}</span>
            <span aria-hidden>·</span>
            <span>{FEED_KIND_LABELS[item.kind]}</span>
            <span aria-hidden>·</span>
            <span suppressHydrationWarning>{formatRelative(item.publishedAt)}</span>
            {reach && <span className="tabular-nums">· {reach}</span>}
          </p>
          <h2
            id={`post-${item.id}`}
            className="display text-pretty break-words text-[1.7rem] leading-[1.08] @4xl:text-[2.1rem]"
          >
            {headlineOf(item)}
          </h2>
          {item.title && (
            <p className="line-clamp-3 text-pretty text-foreground/75 leading-relaxed">
              {item.body}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <FeedStatusMark item={item} status={status} />
            {topic && (
              <Link
                href={`/feed?sujet=${topic.id}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-raised px-3 py-1 font-medium text-sm transition-colors hover:bg-active"
              >
                <Layers aria-hidden className="size-4" />
                Repris par {topic.sources} sources
              </Link>
            )}
          </div>
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
            <OpenPostForm postId={item.id} target="case" variant="default" />
            <OpenPostForm postId={item.id} target="court" variant="secondary" />
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="link-arrow ml-auto text-muted-foreground text-sm transition-colors hover:text-foreground"
            >
              Source
              <ArrowUpRight aria-hidden className="size-3.5" />
              <span className="sr-only">(nouvel onglet)</span>
            </a>
          </div>
        </div>
      </article>
    </div>
  );
}
