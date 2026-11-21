import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { publicEnv } from '@/lib/env';
import { AFTER_SIGN_IN_PATH } from '@/lib/navigation';

export function LandingNav({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
        <Link href="/" className="flex items-center gap-2.5 font-semibold text-lg">
          <span
            aria-hidden
            className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm"
          >
            {publicEnv.NEXT_PUBLIC_APP_NAME.charAt(0)}
          </span>
          {publicEnv.NEXT_PUBLIC_APP_NAME}
        </Link>
        <nav
          aria-label="Compte"
          className="flex items-center gap-1 sm:gap-2 [&_a]:whitespace-nowrap"
        >
          {signedIn ? (
            <Button asChild>
              <Link href={AFTER_SIGN_IN_PATH}>Ouvrir MindStack</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/login">Se connecter</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Créer un compte</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
