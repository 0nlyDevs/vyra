'use client';

import { MailWarning } from 'lucide-react';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { resendVerification } from './actions';

// Bandeau tant que l'adresse e-mail n'est pas confirmée. On peut utiliser l'application quand même.
export function VerifyEmailBanner({ email }: { email: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function resend() {
    startTransition(async () => {
      const result = await resendVerification();
      setMessage(
        result.ok && result.data.sent
          ? 'E-mail renvoyé.'
          : 'L’e-mail n’a pas pu partir. Réessayez dans un instant.',
      );
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-warning-soft px-(--inset) py-2 text-foreground text-sm">
      <MailWarning aria-hidden className="size-4 text-warning" />
      <span>
        Confirmez votre adresse <span className="font-medium">{email}</span> avec le lien reçu par
        e-mail.
      </span>
      <Button variant="ghost" size="sm" onClick={resend} disabled={pending}>
        {pending ? 'Envoi…' : 'Renvoyer l’e-mail'}
      </Button>
      {message && (
        <span role="status" className="text-muted-foreground">
          {message}
        </span>
      )}
    </div>
  );
}
