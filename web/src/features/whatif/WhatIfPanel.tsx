'use client';

import { Sparkles } from 'lucide-react';
import { useState, useTransition } from 'react';
import { ToneBadge } from '@/components/common/ToneBadge';
import { FormMessage } from '@/components/form/FormField';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Tone } from '@/lib/domain';
import { cn } from '@/lib/utils';
import { generateWhatIf, type WhatIfView } from './actions';
import type { WhatIfId } from './schema';

// What If ? : « et si la même information était racontée autrement ? »
// Contenu réel : la version calme, sans l'alarme. Affaire fictive : trois versions côte à côte,
// avec ce qui change d'une version à l'autre, pour apprendre à repérer les manipulations.

const TONE_BY_VERSION: Record<WhatIfId, Tone> = {
  calm: 'success',
  faithful: 'success',
  alarmist: 'warning',
  misleading: 'danger',
};

export function WhatIfPanel({ caseId, kind }: { caseId: string; kind: 'real' | 'fictional' }) {
  const [pending, startTransition] = useTransition();
  const [view, setView] = useState<WhatIfView | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const result = await generateWhatIf(caseId);
      if (result.ok) setView(result.data);
      else setError(result.error.message);
    });
  }

  const fictional = kind === 'fictional';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">What If ?</CardTitle>
        <CardDescription>
          {fictional
            ? 'Une même histoire racontée de trois façons : fidèle, alarmiste, trompeuse. À vous de repérer ce qui change.'
            : 'Et si cette information avait été dite calmement ? Les mêmes faits, sans l’alarme ni l’appel à partager.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <Button onClick={onClick} disabled={pending} className="justify-self-start">
          <Sparkles aria-hidden />
          {pending
            ? 'L’IA réécrit…'
            : view
              ? 'Réécrire autrement'
              : fictional
                ? 'Voir les trois versions'
                : 'Voir la version calme'}
        </Button>
        <FormMessage message={error} />
        {view && (
          <div className="grid gap-5" aria-live="polite">
            <div
              className={cn(
                'grid gap-4',
                view.versions.length > 1 && 'lg:grid-cols-3',
                view.versions.length === 1 && 'max-w-3xl',
              )}
            >
              {view.versions.map((version) => (
                <article
                  key={version.id}
                  data-version={version.id}
                  className="grid content-start gap-3 rounded-2xl bg-foreground/[0.04] p-5 shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--foreground)_9%,transparent)]"
                >
                  <ToneBadge tone={TONE_BY_VERSION[version.id]} className="justify-self-start">
                    {version.label}
                  </ToneBadge>
                  <p className="text-pretty leading-relaxed">{version.text}</p>
                  {version.changes.length > 0 && (
                    <ul className="grid gap-1.5 border-t pt-3 text-muted-foreground text-sm">
                      {version.changes.map((change) => (
                        <li key={change} className="flex gap-2">
                          <span
                            aria-hidden
                            className="mt-2 size-1 shrink-0 rounded-full bg-primary"
                          />
                          {change}
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
            {view.takeaway && (
              <p className="max-w-3xl border-primary border-l-2 pl-4 font-medium">
                {view.takeaway}
              </p>
            )}
            <p className="text-muted-foreground text-xs">
              {view.source === 'gemini' ? 'via Gemini' : 'réponse préparée (hors ligne)'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
