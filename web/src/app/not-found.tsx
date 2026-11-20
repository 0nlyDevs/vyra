import Link from 'next/link';
import { EmptyState } from '@/components/states/States';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-screen max-w-2xl content-center px-8">
      <EmptyState
        title="Cette page n’existe pas."
        action={
          <Button asChild>
            <Link href="/">Retour à l’accueil</Link>
          </Button>
        }
      />
    </main>
  );
}
