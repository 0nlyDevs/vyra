'use client';

import { useActionState } from 'react';
import { FormField, FormMessage } from '@/components/form/FormField';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { openCase } from './actions';

// Coller une information suspecte : la plateforme retrouve son affaire ou en ouvre une.
export function NewCaseForm() {
  const [state, formAction, pending] = useActionState(openCase, null);

  const fieldErrors = state && !state.ok ? state.error.fieldErrors : undefined;
  const claimError = fieldErrors?.claim?.[0];
  const formError = state && !state.ok && !fieldErrors ? state.error.message : null;

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="claim">L’information à analyser</Label>
        <Textarea
          id="claim"
          name="claim"
          rows={4}
          required
          placeholder="Collez ici le message, la publication ou l’article reçu."
          aria-invalid={claimError ? true : undefined}
          aria-describedby={claimError ? 'claim-error' : undefined}
        />
        {claimError && (
          <p id="claim-error" className="text-destructive text-sm">
            {claimError}
          </p>
        )}
      </div>
      <FormField
        name="sourceUrl"
        label="Lien où vous l’avez vue (facultatif)"
        type="url"
        inputMode="url"
        placeholder="https://…"
        errors={fieldErrors?.sourceUrl}
      />
      <FormMessage message={formError} />
      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? 'Recherche des versions…' : 'Lancer l’enquête'}
      </Button>
    </form>
  );
}
