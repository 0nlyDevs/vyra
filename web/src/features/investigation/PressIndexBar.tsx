'use client';

import { LoaderCircle, Newspaper, RefreshCw } from 'lucide-react';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { refreshPressIndex } from './actions';

const RELATIVE = new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' });

function since(iso: string | null) {
  if (!iso) return 'jamais mis à jour';
  const minutes = Math.round((Date.parse(iso) - Date.now()) / 60_000);
  if (Math.abs(minutes) < 60) return `mis à jour ${RELATIVE.format(minutes, 'minute')}`;
  return `mis à jour ${RELATIVE.format(Math.round(minutes / 60), 'hour')}`;
}

// L'état de l'index de presse, et le bouton pour le récolter à la demande (avant une démo).
export function PressIndexBar({
  total,
  embedded,
  sources,
  lastHarvest,
}: {
  total: number;
  embedded: number;
  sources: number;
  lastHarvest: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function refresh() {
    setMessage(null);
    startTransition(async () => {
      const result = await refreshPressIndex();
      setMessage(
        result.ok
          ? `${result.data.added} nouveaux articles, ${result.data.embedded} analysés par l’IA.`
          : result.error.message,
      );
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border px-5 py-3 text-sm">
      <p className="flex items-center gap-2">
        <Newspaper className="size-4 text-primary" aria-hidden />
        <span>
          <strong className="font-semibold tabular-nums">{total}</strong> articles de{' '}
          <span className="tabular-nums">{sources}</span> journaux dans l’index de presse (
          <span className="tabular-nums">{embedded}</span> analysés par l’IA),{' '}
          <span suppressHydrationWarning>{since(lastHarvest)}</span>.
        </span>
        {message && (
          <span role="status" className="text-muted-foreground">
            {message}
          </span>
        )}
      </p>
      <Button variant="outline" size="sm" onClick={refresh} disabled={pending}>
        {pending ? (
          <LoaderCircle className="animate-spin" aria-hidden />
        ) : (
          <RefreshCw aria-hidden />
        )}
        {pending ? 'Récolte en cours…' : 'Mettre à jour l’index'}
      </Button>
    </div>
  );
}
