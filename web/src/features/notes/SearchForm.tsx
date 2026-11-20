'use client';

import { Search } from 'lucide-react';
import { useActionState } from 'react';
import { FormField, FormMessage } from '@/components/form/FormField';
import { EmptyState } from '@/components/states/States';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { searchMyNotes } from './actions';

export function SearchForm() {
  const [state, formAction, pending] = useActionState(searchMyNotes, null);
  const fieldErrors = state && !state.ok ? state.error.fieldErrors?.query : undefined;
  const formError = state && !state.ok && !fieldErrors ? state.error.message : null;

  return (
    <div className="grid gap-4">
      <form action={formAction} className="grid gap-3">
        <FormField
          name="query"
          label="Rechercher dans mes notes"
          hint="Par le sens : « préparer la présentation » trouve aussi « répéter le pitch »."
          errors={fieldErrors}
          required
        />
        <FormMessage message={formError} />
        <Button type="submit" disabled={pending} className="justify-self-start">
          <Search aria-hidden />
          {pending ? 'Recherche…' : 'Rechercher'}
        </Button>
      </form>

      {state?.ok && (
        <div className="grid gap-2" aria-live="polite">
          <Badge variant="secondary">
            {state.data.mode === 'meaning' ? 'Recherche par le sens (IA)' : 'Recherche par mots'}
          </Badge>
          {state.data.notes.length === 0 ? (
            <EmptyState title="Aucune note trouvée." />
          ) : (
            <ul className="grid gap-2">
              {state.data.notes.map((note) => (
                <li key={note.id} className="rounded-lg border px-4 py-3">
                  {note.content}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
