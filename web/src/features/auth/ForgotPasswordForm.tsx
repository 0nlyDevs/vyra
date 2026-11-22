'use client';

import { MailCheck } from 'lucide-react';
import { useActionState, useState } from 'react';
import { FormField, FormMessage } from '@/components/form/FormField';
import { Button } from '@/components/ui/button';
import { requestPasswordReset } from './actions';

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, null);
  const [email, setEmail] = useState('');
  const errors = state && !state.ok ? state.error.fieldErrors : undefined;
  const general = state && !state.ok && !errors ? state.error.message : null;

  if (state?.ok) {
    return (
      <div role="status" className="grid gap-3 rounded-[20px] border border-border bg-card p-5">
        <MailCheck aria-hidden className="size-6 text-foreground" />
        <p className="font-bold">Vérifiez votre boîte de réception.</p>
        <p className="text-muted-foreground text-sm">
          Si un compte utilise cette adresse, un e-mail vient de partir avec un lien valable 1
          heure.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-5" noValidate>
      <FormField
        name="email"
        label="Adresse e-mail"
        type="email"
        autoComplete="email"
        required
        className="min-h-12 px-5"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        errors={errors?.email}
      />
      <FormMessage message={general} />
      <Button type="submit" size="xl" disabled={pending} className="w-full">
        {pending ? 'Envoi…' : 'Recevoir un lien'}
      </Button>
    </form>
  );
}
