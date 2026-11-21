import { ExternalLink, Newspaper } from 'lucide-react';
import { formatRelative } from '@/lib/format';
import type { IndexedNews } from '@/server/dal/news-index';
import { RefreshPressButton } from './RefreshPressButton';

// La presse du jour : les derniers articles de l'index de presse du module Enquête (flux RSS de
// journaux choisis). Ce sont les sources de référence pour retrouver d'où vient une information.
export function PressColumn({ items }: { items: IndexedNews[] }) {
  return (
    <aside
      aria-labelledby="press-title"
      className="grid content-start gap-4 rounded-2xl border bg-card p-5"
    >
      <h2 id="press-title" className="flex items-center gap-2 font-semibold">
        <Newspaper aria-hidden className="size-4 text-primary" />
        Presse du jour
      </h2>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Aucun article pour l’instant. Actualisez pour lire les derniers articles des journaux.
        </p>
      ) : (
        <ul className="grid gap-3">
          {items.map((item) => (
            <li key={item.url} className="grid gap-0.5">
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="text-pretty font-medium text-sm underline-offset-4 hover:underline"
              >
                {item.title}
                <ExternalLink aria-hidden className="ml-1 inline size-3 text-muted-foreground" />
              </a>
              <span className="text-muted-foreground text-xs" suppressHydrationWarning>
                {item.sourceName} · {formatRelative(item.publishedAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <RefreshPressButton />
    </aside>
  );
}
