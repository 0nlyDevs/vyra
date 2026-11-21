'use client';

import { useActionState } from 'react';
import { FormMessage } from '@/components/form/FormField';
import { Button } from '@/components/ui/button';
import { resetPassword } from './actions';
import { PasswordField } from './PasswordField';

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword, null);
  const errors = state && !state.ok ? state.error.fieldErrors : undefined;
  const general =
    state && !state.ok && !errors?.password && !errors?.confirm ? state.error.message : null;

  return (
    <form action={action} className="grid gap-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <PasswordField
        name="password"
        label="Nouveau mot de passe"
        autoComplete="new-password"
        hint="8 caractères au moins."
        errors={errors?.password}
      />
      <PasswordField
        name="confirm"
        label="Le même, une seconde fois"
        autoComplete="new-password"
        errors={errors?.confirm}
      />
      <FormMessage message={general} />
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
      </Button>
    </form>
  );
}
