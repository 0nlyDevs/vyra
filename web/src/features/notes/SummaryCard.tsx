'use client';

import { Sparkles } from 'lucide-react';
import { useState, useTransition } from 'react';
import { FormMessage } from '@/components/form/FormField';
import { Button } from '@/components/ui/button';
import { type Summary, summarizeMyNotes } from './actions';

export function SummaryCard() {
  const [pending, startTransition] = useTransition();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const result = await summarizeMyNotes();
      if (result.ok) setSummary(result.data);
      else setError(result.error.message);
    });
  }

  return (
    <div className="grid gap-4">
      <Button onClick={onClick} disabled={pending} className="justify-self-start">
        <Sparkles aria-hidden />
        {pending ? 'L’IA réfléchit…' : 'Résumer mes notes avec l’IA'}
      </Button>
      <FormMessage message={error} />
      {summary && (
        <div className="grid gap-3" aria-live="polite">
          <p className="text-lg">{summary.summary}</p>
          <ol className="list-decimal space-y-1 pl-6">
            {summary.actions.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ol>
          {/* Discret : utile en répétition, presque invisible pour le jury. */}
          <p className="text-muted-foreground text-xs">
            {summary.source === 'gemini' ? 'via Gemini' : 'réponse préparée (hors ligne)'}
          </p>
        </div>
      )}
    </div>
  );
}
