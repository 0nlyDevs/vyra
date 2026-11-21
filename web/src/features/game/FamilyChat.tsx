'use client';

import { Check, Send, Users, X } from 'lucide-react';
import { useActionState, useEffect, useRef, useState } from 'react';
import { AiSourceBadge } from '@/components/common/DomainBadges';
import { SpeechBubble } from '@/components/common/SpeechBubble';
import { FormMessage } from '@/components/form/FormField';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { sendToFamily } from './actions';
import { FAMILY_FACTS, FAMILY_GROUP_NAME, FAMILY_OPENING, type FamilyFeedback } from './family';

const CRITERIA = [
  { key: 'kind', label: 'Bienveillant', hint: 'personne n’est moqué ni culpabilisé' },
  { key: 'sourced', label: 'Sourcé', hint: 'une source vérifiable est citée' },
  { key: 'useful', label: 'Utile', hint: 'il dit quoi faire' },
] as const satisfies readonly {
  key: keyof Omit<FamilyFeedback, 'tip'>;
  label: string;
  hint: string;
}[];

// La discussion du groupe famille : le joueur écrit, la famille (IA) réagit, le coach évalue.
export function FamilyChat() {
  const [state, formAction, pending] = useActionState(sendToFamily, null);
  const [message, setMessage] = useState('');
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!state?.ok) return;
    setMessage('');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    resultRef.current?.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'nearest',
    });
  }, [state]);

  const fieldError = state && !state.ok ? state.error.fieldErrors?.message?.[0] : undefined;
  const formError = state && !state.ok && !fieldError ? state.error.message : null;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <section
        aria-label={`Discussion « ${FAMILY_GROUP_NAME} »`}
        className="grid gap-4 rounded-xl border bg-card p-5"
      >
        <header className="flex items-center gap-2 border-b pb-3 font-medium">
          <Users aria-hidden className="size-5 text-muted-foreground" />
          {FAMILY_GROUP_NAME}
        </header>

        {FAMILY_OPENING.map((item) => (
          <SpeechBubble key={item.message} speaker={item.name}>
            {item.message}
          </SpeechBubble>
        ))}

        {state?.ok && (
          <div ref={resultRef} className="grid gap-4" aria-live="polite">
            <SpeechBubble speaker="Vous" side="end" tone="primary">
              {state.data.message}
            </SpeechBubble>
            {state.data.replies.map((reply) => (
              <SpeechBubble key={`${reply.name}-${reply.message}`} speaker={reply.name}>
                {reply.message}
              </SpeechBubble>
            ))}
          </div>
        )}

        <form action={formAction} className="grid gap-3 border-t pt-4">
          <Label htmlFor="message">Votre message au groupe</Label>
          <Textarea
            id="message"
            name="message"
            rows={3}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Merci Tonton de penser aux jeunes ! J’ai vérifié…"
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={fieldError ? 'message-error' : undefined}
          />
          {fieldError && (
            <p id="message-error" className="text-destructive text-sm">
              {fieldError}
            </p>
          )}
          <FormMessage message={formError} />
          <Button type="submit" disabled={pending} className="justify-self-start">
            <Send aria-hidden />
            {pending ? 'Envoi…' : state?.ok ? 'Envoyer un autre message' : 'Envoyer au groupe'}
          </Button>
        </form>
      </section>

      <aside className="grid gap-4">
        <section className="grid gap-3 rounded-xl border bg-card p-5">
          <h2 className="font-semibold text-lg">Ce que vous savez</h2>
          <ul className="grid list-disc gap-2 pl-5">
            {FAMILY_FACTS.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </section>

        {state?.ok && (
          <FamilyFeedbackCard feedback={state.data.feedback} source={state.data.source} />
        )}
      </aside>
    </div>
  );
}

// L'avis du coach sur le message : trois critères, puis un conseil.
function FamilyFeedbackCard({
  feedback,
  source,
}: {
  feedback: FamilyFeedback;
  source: 'gemini' | 'fallback';
}) {
  const passed = CRITERIA.filter((criterion) => feedback[criterion.key]).length;
  return (
    <section
      aria-live="polite"
      className={cn(
        'grid gap-3 rounded-xl border p-5',
        passed === CRITERIA.length ? 'bg-success-soft' : 'bg-card',
      )}
    >
      <h2 className="font-semibold text-lg">
        L’avis du coach : {passed} / {CRITERIA.length}
      </h2>
      <ul className="grid gap-2">
        {CRITERIA.map((criterion) => {
          const ok = feedback[criterion.key];
          return (
            <li key={criterion.key} className="flex items-start gap-2">
              {ok ? (
                <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
              ) : (
                <X aria-hidden className="mt-0.5 size-4 shrink-0 text-danger" />
              )}
              <span>
                <span className="font-medium">
                  {criterion.label} {ok ? '' : '(à revoir)'}
                </span>
                <span className="text-muted-foreground"> · {criterion.hint}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <p>{feedback.tip}</p>
      <div>
        <AiSourceBadge source={source} />
      </div>
    </section>
  );
}
