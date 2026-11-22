import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/components/brand/Logo';
import { PublicNav } from '@/components/shell/PublicNav';
import { ReadingControls } from '@/components/shell/ReadingControls';
import { ThemeToggle } from '@/components/shell/ThemeToggle';
import { Button } from '@/components/ui/button';
import { publicEnv } from '@/lib/env';

// Pages ouvertes à tous, sans compte : seules les affaires conclues y apparaissent. La barre est
// la marque, l'île d'encre au centre, les outils à droite.
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <header className="site-bar">
        <div className="site-bar-in">
          <Link
            href="/"
            className="site-word outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Logo name={publicEnv.NEXT_PUBLIC_APP_NAME} />
          </Link>
          <PublicNav />
          <div className="site-tools">
            <ReadingControls className="site-hide-sm" />
            <ThemeToggle />
            <Button asChild variant="outline" className="bg-card">
              <Link href="/login">Se connecter</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto grid w-full max-w-4xl gap-8 px-4 pt-8 pb-16 sm:px-6 sm:pt-12">
        {children}
      </main>
    </div>
  );
}
