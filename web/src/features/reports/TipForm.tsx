'use client';

import { Send } from 'lucide-react';
import { useActionState } from 'react';
import { FormField, FormMessage } from '@/components/form/FormField';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { REPORT_REASON_LABELS, REPORT_REASONS } from '@/lib/domain';
import { submitTip } from './tip-actions';

// Signaler sans compte : le texte ou le lien, et un motif. Rien d'autre n'est demandé.
export function TipForm({ defaultContent }: { defaultContent: string }) {
  const [state, formAction, pending] = useActionState(submitTip, null);
  const fieldErrors = state && !state.ok ? state.error.fieldErrors : undefined;
  const formError = state && !state.ok && !fieldErrors ? state.error.message : null;

  return (
    <form action={formAction} className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="tip-content">Le contenu</Label>
        <Textarea
          id="tip-content"
          name="content"
          rows={4}
          defaultValue={defaultContent}
          placeholder="Collez le texte tel que vous l’avez reçu."
          aria-invalid={fieldErrors?.content ? true : undefined}
          aria-describedby={fieldErrors?.content ? 'tip-content-error' : undefined}
        />
        {fieldErrors?.content && (
          <p id="tip-content-error" className="text-destructive text-sm">
            {fieldErrors.content[0]}
          </p>
        )}
      </div>

      <FormField
        name="url"
        label="Ou son lien (facultatif)"
        inputMode="url"
        placeholder="https://"
        errors={fieldErrors?.url}
      />

      <fieldset className="grid gap-2">
        <legend className="mb-2 font-medium text-sm">Motif</legend>
        <RadioGroup
          name="reason"
          aria-invalid={fieldErrors?.reason ? true : undefined}
          className="grid gap-2 sm:grid-cols-2"
        >
          {REPORT_REASONS.map((value) => (
            <Label
              key={value}
              htmlFor={`tip-reason-${value}`}
              className="flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 font-normal transition-colors hover:bg-muted has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent"
            >
              <RadioGroupItem id={`tip-reason-${value}`} value={value} />
              {REPORT_REASON_LABELS[value]}
            </Label>
          ))}
        </RadioGroup>
        {fieldErrors?.reason && <p className="text-destructive text-sm">{fieldErrors.reason[0]}</p>}
      </fieldset>

      <FormMessage message={formError} />
      <Button type="submit" size="lg" disabled={pending} className="justify-self-start">
        <Send aria-hidden />
        {pending ? 'Envoi…' : 'Signaler'}
      </Button>
    </form>
  );
}
