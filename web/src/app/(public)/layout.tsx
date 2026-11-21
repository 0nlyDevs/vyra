import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/button';
import { publicEnv } from '@/lib/env';

// Pages ouvertes à tous, sans compte : seules les affaires conclues y apparaissent.
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="dark min-h-[100dvh] bg-background text-foreground">
      <header className="glass sticky top-0 z-20 flex items-center gap-3 px-5 py-2.5">
        <Link
          href="/"
          className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <Logo name={publicEnv.NEXT_PUBLIC_APP_NAME} />
        </Link>
        <nav aria-label="Pages publiques" className="ml-auto flex items-center gap-1">
          <Button asChild variant="ghost">
            <Link href="/verifier">Vérifier</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/login">Se connecter</Link>
          </Button>
        </nav>
      </header>
      <main className="mx-auto grid w-full max-w-4xl gap-8 px-5 py-10">{children}</main>
    </div>
  );
}
