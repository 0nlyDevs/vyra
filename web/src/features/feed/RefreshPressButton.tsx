'use client';

import { RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { refreshPressIndex } from '@/features/investigation/actions';

// Récolte les flux RSS de l'index de presse (module Enquête), puis recharge le fil.
export function RefreshPressButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function refresh() {
    setMessage(null);
    startTransition(async () => {
      const result = await refreshPressIndex();
      setMessage(
        result.ok
          ? `${result.data.added} nouvel${result.data.added > 1 ? 's' : ''} article${result.data.added > 1 ? 's' : ''}.`
          : result.error.message,
      );
      router.refresh();
    });
  }

  return (
    <div className="grid gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={refresh}
        disabled={pending}
        className="justify-self-start"
      >
        <RefreshCw
          aria-hidden
          className={pending ? 'animate-spin motion-reduce:animate-none' : undefined}
        />
        {pending ? 'Lecture des journaux…' : 'Actualiser'}
      </Button>
      {message && (
        <p role="status" className="text-muted-foreground text-xs">
          {message}
        </p>
      )}
    </div>
  );
}
