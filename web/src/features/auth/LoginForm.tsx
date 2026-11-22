'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { FormField, FormMessage } from '@/components/form/FormField';
import { Button } from '@/components/ui/button';
import { signIn } from './actions';
import { PasswordField } from './PasswordField';

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, null);
  // Contrôlé : l'adresse reste remplie après une erreur.
  const [email, setEmail] = useState('');
  const errors = state && !state.ok ? state.error.fieldErrors : undefined;
  const general = state && !state.ok && !errors ? state.error.message : null;

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
      <PasswordField
        name="password"
        label="Mot de passe"
        autoComplete="current-password"
        errors={errors?.password}
        action={
          <Link
            href="/forgot-password"
            className="font-medium text-foreground text-sm underline decoration-border underline-offset-4 hover:decoration-foreground"
          >
            Mot de passe oublié ?
          </Link>
        }
      />
      <FormMessage message={general} />
      <Button type="submit" size="xl" disabled={pending} className="w-full">
        {pending ? 'Connexion…' : 'Se connecter'}
      </Button>
    </form>
  );
}
