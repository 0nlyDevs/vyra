'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Champ de mot de passe avec bouton pour l'afficher, aide et erreur annoncées avec le champ.
export function PasswordField({
  name,
  label,
  autoComplete,
  hint,
  errors,
  action,
}: {
  name: string;
  label: string;
  autoComplete: 'current-password' | 'new-password';
  hint?: string;
  errors?: string[] | undefined;
  action?: React.ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  const hintId = `${name}-hint`;
  const errorId = `${name}-error`;
  const hasError = Boolean(errors?.length);
  const describedBy = [hint ? hintId : null, hasError ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={name}>{label}</Label>
        {action}
      </div>
      <div className="relative">
        <Input
          id={name}
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          className="min-h-12 pr-14 pl-5"
          aria-invalid={hasError || undefined}
          aria-describedby={describedBy || undefined}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          aria-pressed={visible}
          aria-controls={name}
          className="absolute inset-y-0 right-1.5 my-auto inline-flex size-9 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-raised hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground focus-visible:outline-offset-2"
        >
          {visible ? (
            <EyeOff aria-hidden className="size-5" />
          ) : (
            <Eye aria-hidden className="size-5" />
          )}
        </button>
      </div>
      {hint && (
        <p id={hintId} className="text-muted-foreground text-sm">
          {hint}
        </p>
      )}
      {hasError && (
        <p id={errorId} className="text-destructive text-sm">
          {errors?.[0]}
        </p>
      )}
    </div>
  );
}
