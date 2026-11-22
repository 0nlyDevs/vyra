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

// Recherche thématique dans les affaires jugées, par le sens et sur plusieurs sujets à la fois.
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
          Rechercher dans les affaires jugées
        </Label>
        <Textarea
          ref={queryRef}
          id="judged-query"
          name="query"
          rows={3}
          placeholder="Un nom, un sujet ou un message, par exemple « Poutine et Donald Trump »."
          minLength={2}
          maxLength={1000}
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
          {result.items.length > 0 ? (
            <div className="grid gap-3">
              <p className="text-muted-foreground text-sm">
                Affaires sur des sujets proches. Chaque conclusion concerne l’affaire citée.
              </p>
              {result.items.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-3 rounded-xl border border-foreground bg-raised p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <ToneBadge tone="info">Déjà jugé</ToneBadge>
                    <span className="font-medium">{item.title}</span>
                    {item.certainty && <CertaintyBadge level={item.certainty} />}
                  </div>
                  {item.conclusion && <p className="text-pretty">{item.conclusion}</p>}
                  <div className="flex flex-wrap items-center gap-3">
                    <Button asChild size="sm">
                      <Link href={`/court/${item.id}`}>
                        Voir l’audience
                        <ArrowRight aria-hidden data-icon="inline-end" />
                      </Link>
                    </Button>
                    <span className="text-muted-foreground text-xs">Trouvé par le sens</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed p-4 text-muted-foreground">
              Aucune affaire jugée assez proche de cette recherche n’a été trouvée. Essayez une
              autre formulation ou ouvrez une enquête.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
