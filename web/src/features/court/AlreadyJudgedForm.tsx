'use client';

import { ArrowRight, Search } from 'lucide-react';
import Link from 'next/link';
import { useActionState, useRef } from 'react';
import { CertaintyBadge } from '@/components/common/DomainBadges';
import { ToneBadge } from '@/components/common/ToneBadge';
import { FormMessage } from '@/components/form/FormField';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { appendText, DictateButton } from '@/features/dictation/DictateButton';
import { checkAlreadyJudged } from './actions';

// « Déjà jugé » : on colle une information, on retrouve l'affaire conclue qui lui ressemble.
export function AlreadyJudgedForm() {
  const [state, action, pending] = useActionState(checkAlreadyJudged, null);
  const fieldError = state && !state.ok ? state.error.fieldErrors?.query?.[0] : undefined;
  const generalError = state && !state.ok && !fieldError ? state.error.message : null;
  const result = state?.ok ? state.data : null;
  const queryRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="grid gap-4">
      <form action={action} className="grid gap-3">
        <Label htmlFor="judged-query" className="text-base">
          Cette information a-t-elle déjà été jugée ?
        </Label>
        <Textarea
          ref={queryRef}
          id="judged-query"
          name="query"
          rows={3}
          placeholder="Collez le message reçu, même reformulé."
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError ? 'judged-query-error' : undefined}
        />
        {fieldError && (
          <p id="judged-query-error" className="text-destructive text-sm">
            {fieldError}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>
            <Search aria-hidden />
            {pending ? 'Recherche…' : 'Chercher'}
          </Button>
          <DictateButton
            onText={(text) => {
              if (queryRef.current)
                queryRef.current.value = appendText(queryRef.current.value, text);
            }}
          />
        </div>
      </form>
      <FormMessage message={generalError} />

      {result && (
        <div aria-live="polite">
          {result.item ? (
            <div className="grid gap-3 rounded-xl border border-foreground bg-raised p-4">
              <div className="flex flex-wrap items-center gap-2">
                <ToneBadge tone="info">Déjà jugé</ToneBadge>
                <span className="font-medium">{result.item.title}</span>
                {result.item.certainty && <CertaintyBadge level={result.item.certainty} />}
              </div>
              {result.item.conclusion && <p className="text-pretty">{result.item.conclusion}</p>}
              <div className="flex flex-wrap items-center gap-3">
                <Button asChild size="sm">
                  <Link href={`/court/${result.item.id}`}>
                    Voir l’audience
                    <ArrowRight aria-hidden data-icon="inline-end" />
                  </Link>
                </Button>
                <span className="text-muted-foreground text-xs">
                  {result.mode === 'meaning' ? 'Trouvé par le sens' : 'Trouvé par les mots'}
                </span>
              </div>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed p-4 text-muted-foreground">
              Aucune affaire jugée ne ressemble à cette information. Ouvrez une enquête pour la
              vérifier.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
