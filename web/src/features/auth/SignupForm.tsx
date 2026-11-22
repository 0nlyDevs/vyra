'use client';

import { useActionState, useState } from 'react';
import { FormField, FormMessage } from '@/components/form/FormField';
import { Button } from '@/components/ui/button';
import { signUp } from './actions';
import { PasswordField } from './PasswordField';

export function SignupForm() {
  const [state, action, pending] = useActionState(signUp, null);
  // Contrôlés : le nom et l'adresse restent remplis après une erreur.
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const errors = state && !state.ok ? state.error.fieldErrors : undefined;
  const general = state && !state.ok && !errors ? state.error.message : null;

  return (
    <form action={action} className="grid gap-5" noValidate>
      <FormField
        name="name"
        label="Votre nom"
        autoComplete="name"
        required
        className="min-h-12 px-5"
        value={name}
        onChange={(event) => setName(event.target.value)}
        errors={errors?.name}
      />
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
        autoComplete="new-password"
        hint="8 caractères au moins, difficile à deviner : une phrase de plusieurs mots marche bien."
        errors={errors?.password}
      />
      <FormMessage message={general} />
      <Button type="submit" size="xl" disabled={pending} className="w-full">
        {pending ? 'Création du compte…' : 'Créer un compte'}
      </Button>
    </form>
  );
}
