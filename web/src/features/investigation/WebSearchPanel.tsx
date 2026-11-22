'use client';

import { Globe, LoaderCircle, RotateCcw, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Steps } from '@/components/common/Steps';
import { Button } from '@/components/ui/button';
import type { WebSearchStatus } from '@/lib/domain';
import { searchWeb } from './actions';

const STEPS = ['Recherche sur le web', 'Lecture des sources', 'Comparaison du sens'];
// Passage indicatif aux étapes suivantes : la recherche répond en 2 à 3 secondes, puis on lit
// la date des sources qui n'en ont pas.
const STEP_AT_MS = [3_000, 8_000];

type Done = { status: WebSearchStatus; kept: number; contradicting: number };

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
    const { status, kept, contradicting } = result.data;
    setDone({ status, kept, contradicting });
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
        className="grid gap-4 rounded-xl border border-foreground bg-raised p-5"
      >
        <p className="flex items-center gap-2 font-medium">
          <LoaderCircle className="size-5 animate-spin text-primary" aria-hidden />
          Recherche de cette information sur le web…
        </p>
        <Steps steps={STEPS} current={step} />
        <p className="text-muted-foreground text-sm">
          Presse, forums, Reddit et pages publiques des réseaux sociaux. Quelques secondes.
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
    <div className="grid gap-2 rounded-xl border px-5 py-4">
      <WebSearchSummary done={done} />
      {done.contradicting > 0 && (
        <p className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
          <span>
            <strong className="font-semibold">
              {done.contradicting} {done.contradicting > 1 ? 'sources démentent' : 'source dément'}
            </strong>{' '}
            cette information, selon l’IA : dans l’arbre, leur lien porte la mention « Dément
            l’information ».
          </span>
        </p>
      )}
    </div>
  );
}

function WebSearchSummary({ done }: { done: Done }) {
  return (
    <p className="flex items-start gap-2">
      <Globe className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
      {done.status === 'found' ? (
        <span>
          <strong className="font-semibold">
            {done.kept} {done.kept > 1 ? 'sources retrouvées' : 'source retrouvée'}
          </strong>{' '}
          sur le web. Dans l’arbre, chacune est reliée à celle qu’elle reprend ; cliquez sur un lien
          pour voir ce qui change, ou sur une source pour la lire et l’explorer.
        </span>
      ) : (
        <span>
          <strong className="font-semibold">Aucune source publique</strong> ne rapporte cette
          information. Cette absence ne prouve rien : elle circule peut-être dans des groupes privés
          (WhatsApp, Facebook), que personne ne peut fouiller.
        </span>
      )}
    </p>
  );
}
