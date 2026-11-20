'use client';

import { useActionState, useEffect, useRef } from 'react';
import { FormMessage } from '@/components/form/FormField';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { addNote } from './actions';

export function NoteForm() {
  const [state, formAction, pending] = useActionState(addNote, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  const fieldError = state && !state.ok ? state.error.fieldErrors?.content?.[0] : undefined;
  const formError = state && !state.ok && !fieldError ? state.error.message : null;

  return (
    <form ref={formRef} action={formAction} className="grid gap-3">
      <Label htmlFor="content">Nouvelle note</Label>
      <Textarea
        id="content"
        name="content"
        rows={3}
        required
        aria-invalid={fieldError ? true : undefined}
        aria-describedby={fieldError ? 'content-error' : undefined}
      />
      {fieldError && (
        <p id="content-error" className="text-destructive text-sm">
          {fieldError}
        </p>
      )}
      <FormMessage message={formError} />
      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? 'Enregistrement…' : 'Ajouter la note'}
      </Button>
    </form>
  );
}
