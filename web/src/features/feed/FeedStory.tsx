import type { FeedStatus } from '@/lib/domain';
import { formatRelative } from '@/lib/format';
import type { FeedItem } from '@/server/dal/feed';
import { FeedImage } from './FeedImage';
import { FeedStatusMark } from './FeedStatusMark';
import { headlineOf, KIND_ICONS } from './meta';
import { OpenPostForm } from './OpenPostForms';

// Une histoire secondaire, sous la une : une image, trois lignes de titre, une action. Trois côte à
// côte sur un grand écran ; sur un téléphone, une rangée qui se fait défiler de côté.
export function FeedStory({ item, status }: { item: FeedItem; status: FeedStatus }) {
  const Icon = KIND_ICONS[item.kind];
  return (
    <article
      aria-labelledby={`post-${item.id}`}
      className="group/story grid w-[16.5rem] shrink-0 snap-start grid-rows-[auto_1fr] overflow-hidden surface sm:w-auto"
    >
      {item.imageUrl ? (
        <div className="overflow-hidden">
          <FeedImage
            src={item.imageUrl}
            className="aspect-[16/10] rounded-none border-0 transition-transform duration-700 ease-out-strong group-hover/story:scale-[1.04]"
          />
        </div>
      ) : (
        <div className="grid aspect-[16/10] place-items-center bg-raised text-muted-foreground">
          <Icon aria-hidden className="size-8" />
        </div>
      )}
      <div className="grid content-start gap-2 p-4">
        <p className="truncate text-muted-foreground text-sm">
          <span className="font-medium text-foreground">{item.sourceName}</span>
          <span aria-hidden> · </span>
          <span suppressHydrationWarning>{formatRelative(item.publishedAt)}</span>
        </p>
        <h3
          id={`post-${item.id}`}
          className="line-clamp-3 text-pretty font-semibold text-[1.05rem] leading-snug"
        >
          {headlineOf(item)}
        </h3>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <FeedStatusMark item={item} status={status} />
          <OpenPostForm postId={item.id} target="case" variant="ghost" />
        </div>
      </div>
    </article>
  );
}
