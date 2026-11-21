'use client';

import { Check, LoaderCircle, Network } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { exploreSource } from './actions';

// « Explorer cette source » : cherche qui l'a reprise ensuite ; l'arbre gagne une génération.
export function ExploreButton({
  caseId,
  versionId,
  added,
}: {
  caseId: string;
  versionId: string;
  // Reprises ajoutées par une exploration déjà faite ; `null` : pas encore explorée.
  added: number | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  if (added !== null) {
    return (
      <p className="flex items-center gap-2 text-muted-foreground text-sm">
        <Check className="size-4" aria-hidden />
        {added > 0
          ? `Source explorée : ${added} ${added > 1 ? 'reprises ajoutées' : 'reprise ajoutée'} à l’arbre.`
          : 'Source explorée : aucune reprise publique retrouvée après elle.'}
      </p>
    );
  }

  function explore() {
    setMessage(null);
    startTransition(async () => {
      const result = await exploreSource(caseId, versionId);
      if (!result.ok) {
        setMessage(result.error.message);
        return;
      }
      setMessage(
        result.data.added > 0
          ? `${result.data.added} ${result.data.added > 1 ? 'reprises ajoutées' : 'reprise ajoutée'} à l’arbre.`
          : 'Aucune reprise publique retrouvée pour cette source.',
      );
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="outline" onClick={explore} disabled={pending} className="justify-self-start">
        {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Network aria-hidden />}
        {pending ? 'Recherche de ses reprises…' : 'Explorer cette source'}
      </Button>
      {message && (
        <span role="status" className="text-muted-foreground text-sm">
          {message}
        </span>
      )}
    </div>
  );
}
