'use client';

import { Globe, LoaderCircle, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Steps } from '@/components/common/Steps';
import { Button } from '@/components/ui/button';
import type { WebSearchStatus } from '@/lib/domain';
import { searchWeb } from './actions';

const STEPS = ['Recherche dans la presse', 'Lecture des articles', 'Comparaison du sens'];
// Passage indicatif aux étapes suivantes : GDELT met souvent 10 à 20 secondes à répondre.
const STEP_AT_MS = [14_000, 22_000];

type Done = { status: WebSearchStatus; kept: number };

// Recherche web d'une nouvelle affaire, lancée toute seule à l'ouverture de sa page. Les articles
// retenus apparaissent dans le graphe dès qu'elle se termine.
export function WebSearchPanel({
  caseId,
  previous,
  autoStart,
}: {
  caseId: string;
  previous: Done | null;
  autoStart: boolean;
}) {
  const router = useRouter();
  const [done, setDone] = useState<Done | null>(previous);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const started = useRef(false);

  const run = useCallback(async () => {
    setRunning(true);
    setError(null);
    setStep(0);
    const handles = STEP_AT_MS.map((at, index) => window.setTimeout(() => setStep(index + 1), at));
    const result = await searchWeb(caseId);
    for (const handle of handles) window.clearTimeout(handle);
    setRunning(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    if (result.data.status === 'prepared') return;
    setDone({ status: result.data.status, kept: result.data.kept });
    if (result.data.kept > 0) router.refresh();
  }, [caseId, router]);

  useEffect(() => {
    // Une seule fois, même quand React monte deux fois le composant en développement.
    if (!autoStart || previous || started.current) return;
    started.current = true;
    void run();
  }, [autoStart, previous, run]);

  if (running) {
    return (
      <section
        aria-live="polite"
        className="grid gap-4 rounded-xl border border-primary/30 bg-primary/5 p-5"
      >
        <p className="flex items-center gap-2 font-medium">
          <LoaderCircle className="size-5 animate-spin text-primary" aria-hidden />
          Recherche de cette information sur le web…
        </p>
        <Steps steps={STEPS} current={step} />
        <p className="text-muted-foreground text-sm">
          Articles de presse des trois derniers mois (GDELT). Cela prend souvent une vingtaine de
          secondes.
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section
        role="alert"
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-5"
      >
        <p className="flex items-center gap-2">
          <Globe className="size-5 text-muted-foreground" aria-hidden />
          {error}
        </p>
        <Button variant="outline" onClick={() => void run()}>
          <RotateCcw aria-hidden />
          Relancer la recherche
        </Button>
      </section>
    );
  }

  if (!done) return null;
  return (
    <p className="flex items-start gap-2 rounded-xl border px-5 py-4">
      <Globe className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
      {done.status === 'found' ? (
        <span>
          <strong className="font-semibold">
            {done.kept}{' '}
            {done.kept > 1 ? 'articles de presse retrouvés' : 'article de presse retrouvé'}
          </strong>{' '}
          sur le web. Ils sont rangés par date dans le graphe ; cliquez sur un point pour lire
          l’article et ouvrir sa source.
        </span>
      ) : (
        <span>
          <strong className="font-semibold">Aucun article de presse</strong> des trois derniers mois
          ne rapporte cette information. Cette absence ne prouve rien : elle circule peut-être
          seulement sur les réseaux sociaux.
        </span>
      )}
    </p>
  );
}
