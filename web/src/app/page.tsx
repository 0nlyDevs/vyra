import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { publicEnv } from '@/lib/env';

// Première page vue par le jury : le nom, la promesse en une phrase, un bouton.
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-start justify-center gap-8 px-8">
      <p className="font-medium text-muted-foreground">
        Équipe MindStack · DevFest Antananarivo 2026
      </p>
      <h1 className="font-semibold text-5xl tracking-tight">{publicEnv.NEXT_PUBLIC_APP_NAME}</h1>
      <p className="max-w-2xl text-2xl text-muted-foreground">
        La promesse du projet en une phrase, à écrire une fois le sujet connu.
      </p>
      <Button asChild size="lg">
        <Link href="/login">Commencer la démo</Link>
      </Button>
    </main>
  );
}
