'use client';

import { RotateCcw } from 'lucide-react';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { resetDemo } from './actions';

export function ResetDemoButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function onClick() {
    setMessage(null);
    startTransition(async () => {
      const result = await resetDemo();
      setMessage(result.ok ? 'Démo réinitialisée.' : result.error.message);
    });
  }

  return (
    <div className="flex items-center gap-3">
      <span role="status" className="text-muted-foreground text-sm">
        {message}
      </span>
      <Button variant="outline" onClick={onClick} disabled={pending}>
        <RotateCcw aria-hidden />
        {pending ? 'Réinitialisation…' : 'Réinitialiser la démo'}
      </Button>
    </div>
  );
}
