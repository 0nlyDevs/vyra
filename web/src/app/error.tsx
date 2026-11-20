'use client';

import { ErrorState } from '@/components/states/States';
import { Button } from '@/components/ui/button';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto grid min-h-screen max-w-2xl content-center px-8">
      <ErrorState action={<Button onClick={reset}>Réessayer</Button>} />
    </main>
  );
}
