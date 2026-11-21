import { ArrowUpRight, TrendingUp } from 'lucide-react';
import type { FeedItem } from '@/server/dal/feed';

const numbers = new Intl.NumberFormat('fr-FR');

// « Ce que le monde cherche » : les recherches Google qui montent le plus, par pays.
export function TrendsColumn({ trends }: { trends: FeedItem[] }) {
  return (
    <section aria-labelledby="trends-title" className="grid gap-3 rounded-2xl border bg-card p-5">
      <div className="grid gap-1">
        <h2 id="trends-title" className="flex items-center gap-2 font-semibold">
          <TrendingUp aria-hidden className="size-4 text-primary" />
          Ce que le monde cherche
        </h2>
        <p className="text-muted-foreground text-sm">
          Les recherches Google qui montent. Google ne publie pas celles de Madagascar.
        </p>
      </div>
      {trends.length === 0 ? (
        <p className="text-muted-foreground text-sm">Rien de récolté pour l’instant.</p>
      ) : (
        <ol className="grid gap-3">
          {trends.map((trend) => (
            <li key={trend.id} className="grid gap-0.5">
              <a
                href={trend.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
              >
                {trend.title ?? trend.body}
                <ArrowUpRight aria-hidden className="size-3.5 text-muted-foreground" />
                <span className="sr-only">(nouvel onglet)</span>
              </a>
              <span className="text-muted-foreground text-sm tabular-nums">
                {trend.sourceName.replace(/^Tendances · /, '')}
                {trend.reach ? ` · ${numbers.format(trend.reach)}+ recherches` : ''}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
