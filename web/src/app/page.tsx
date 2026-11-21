import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { publicEnv } from '@/lib/env';

// Première page vue par le jury : le nom, la promesse en une phrase, un bouton.
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-start justify-center gap-8 px-8">
      <p className="font-medium text-primary">Équipe MindStack · DevFest Antananarivo 2026</p>
      <h1 className="font-semibold text-6xl">{publicEnv.NEXT_PUBLIC_APP_NAME}</h1>
      <p className="max-w-2xl text-2xl text-muted-foreground">
        Voir d’où vient une information, entendre les deux côtés, et conclure seulement quand les
        preuves le permettent.
      </p>
      <Button asChild size="lg">
        <Link href="/login">
          Commencer la démo
          <ArrowRight aria-hidden data-icon="inline-end" />
        </Link>
      </Button>
    </main>
  );
}
