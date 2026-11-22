import { ArrowUpRight, Layers, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import type { FeedItem } from '@/server/dal/feed';
import type { FeedTopic } from './topics';

// Sur un téléphone, les « sujets qui reviennent » et « ce que le monde cherche » ne passent pas
// sous vingt lignes : ce sont deux rangées qui défilent de côté, juste après les histoires du jour.
export function AsideStrips({ topics, trends }: { topics: FeedTopic[]; trends: FeedItem[] }) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 lg:hidden">
      {topics.length > 0 && (
        <section aria-labelledby="strip-topics" className="grid min-w-0 gap-2.5">
          <h2 id="strip-topics" className="flex items-center gap-2 font-semibold">
            <Layers aria-hidden className="size-4 text-primary" />
            Sujets qui reviennent
          </h2>
          <ul className="relative -mx-4 flex max-w-[100vw] snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1">
            {topics.map((topic) => (
              <li key={topic.id} className="w-60 shrink-0 snap-start">
                <Link
                  href={`/feed?sujet=${topic.id}`}
                  className="grid h-full content-between gap-3 surface p-4 transition-colors hover:bg-raised"
                >
                  <span className="line-clamp-3 font-medium leading-snug">{topic.label}</span>
                  <span className="text-muted-foreground text-sm">{topic.sources} sources</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {trends.length > 0 && (
        <section aria-labelledby="strip-trends" className="grid min-w-0 gap-2.5">
          <h2 id="strip-trends" className="flex items-center gap-2 font-semibold">
            <TrendingUp aria-hidden className="size-4 text-primary" />
            Ce que le monde cherche
          </h2>
          <ul className="relative -mx-4 flex max-w-[100vw] snap-x scroll-px-4 gap-2 overflow-x-auto px-4 pb-1">
            {trends.map((trend) => (
              <li key={trend.id} className="shrink-0 snap-start">
                <a
                  href={trend.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-raised px-3.5 py-2 text-sm transition-colors hover:bg-active"
                >
                  {trend.title ?? trend.body}
                  <ArrowUpRight aria-hidden className="size-3.5 text-muted-foreground" />
                  <span className="sr-only">(nouvel onglet)</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
