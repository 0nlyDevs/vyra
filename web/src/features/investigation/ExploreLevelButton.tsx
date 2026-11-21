'use client';

import { Layers, LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { exploreNextLevel } from './actions';

// « Explorer un niveau de plus » : chaque source en bout de branche est explorée (ses liens, puis
// ses reprises sur le web). L'arbre gagne une génération ; on peut recommencer.
export function ExploreLevelButton({ caseId, frontier }: { caseId: string; frontier: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  if (frontier === 0) return null;

  function explore() {
    setMessage(null);
    startTransition(async () => {
      const result = await exploreNextLevel(caseId);
      if (!result.ok) {
        setMessage(result.error.message);
        return;
      }
      setMessage(
        result.data.added > 0
          ? `${result.data.added} sources ajoutées en explorant ${result.data.explored} sources.`
          : `Aucune nouvelle source en explorant ${result.data.explored} sources.`,
      );
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={explore} disabled={pending}>
        {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Layers aria-hidden />}
        {pending
          ? `Exploration de ${frontier} sources…`
          : `Explorer un niveau de plus (${frontier} ${frontier > 1 ? 'sources' : 'source'})`}
      </Button>
      {pending && (
        <span className="text-muted-foreground text-sm">
          Leurs liens, puis leurs reprises sur le web : environ 20 secondes par lot de trois.
        </span>
      )}
      {message && !pending && (
        <span role="status" className="text-muted-foreground text-sm">
          {message}
        </span>
      )}
    </div>
  );
}
