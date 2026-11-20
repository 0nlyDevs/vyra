import type { ComponentProps } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type FormFieldProps = ComponentProps<typeof Input> & {
  name: string;
  label: string;
  errors?: string[] | undefined;
  /** Aide sous le champ (format attendu…), lue avec le champ. */
  hint?: string;
};

// Champ de formulaire accessible : libellé relié, aide et erreur annoncées avec le champ
// (`aria-describedby` : aide, puis erreur), état invalide exposé (`aria-invalid`).
export function FormField({
  name,
  label,
  errors,
  hint,
  'aria-describedby': describedBy,
  ...inputProps
}: FormFieldProps) {
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;
  const hasError = Boolean(errors?.length);
  const description =
    [describedBy, hint ? hintId : undefined, hasError ? errorId : undefined]
      .filter(Boolean)
      .join(' ') || undefined;
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        aria-invalid={hasError || undefined}
        aria-describedby={description}
        {...inputProps}
      />
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

// Erreur générale d'un formulaire (hors champ), annoncée aux lecteurs d'écran.
export function FormMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-destructive text-sm">
      {message}
    </p>
  );
}
