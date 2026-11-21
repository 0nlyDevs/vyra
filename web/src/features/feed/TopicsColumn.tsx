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
        <ol className="grid gap-3">
          {topics.map((topic) => {
            const kinds = [...new Set(topic.items.map((item) => FEED_KIND_LABELS[item.kind]))];
            return (
              <li key={topic.id} className="grid gap-0.5">
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
