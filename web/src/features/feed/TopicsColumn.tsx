import { Layers } from 'lucide-react';
import Link from 'next/link';
import { FEED_KIND_LABELS } from '@/lib/domain';
import type { FeedTopic } from './topics';

// « Sujets qui reviennent » : les sujets repris par le plus de sources différentes.
export function TopicsColumn({ topics }: { topics: FeedTopic[] }) {
  return (
    <section aria-labelledby="topics-title" className="grid gap-3 surface p-5">
      <div className="grid gap-1">
        <h2 id="topics-title" className="flex items-center gap-2 font-semibold">
          <Layers aria-hidden className="size-4 text-primary" />
          Sujets qui reviennent
        </h2>
        <p className="text-muted-foreground text-sm">
          Repris par plusieurs sources ces trois derniers jours : à vérifier en premier.
        </p>
      </div>
      {topics.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Aucun sujet repris pour l’instant (il faut l’IA pour comparer le sens des publications).
        </p>
      ) : (
        <ol className="grid gap-4">
          {topics.map((topic, index) => {
            const kinds = [...new Set(topic.items.map((item) => FEED_KIND_LABELS[item.kind]))];
            return (
              <li key={topic.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5">
                <span className="display row-span-2 pt-0.5 text-[1.15rem] text-primary tabular-nums">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <Link
                  href={`/feed?sujet=${topic.id}`}
                  className="line-clamp-2 font-medium underline-offset-4 hover:underline"
                >
                  {topic.label}
                </Link>
                <span className="text-muted-foreground text-sm">
                  {topic.sources} sources · {kinds.join(', ')}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
