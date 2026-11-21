import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/button';
import { publicEnv } from '@/lib/env';
import { AFTER_SIGN_IN_PATH } from '@/lib/navigation';

// La barre de l'accueil : du verre qui flotte au-dessus du haut de page, le logo au centre.
export function LandingNav({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-5 sm:pt-4">
      <div className="glass mx-auto grid h-14 max-w-[84rem] grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-full px-2 pl-5 shadow-[0_18px_50px_oklch(0.05_0.02_24/0.45)]">
        <nav
          aria-label="Sections"
          className="hidden items-center gap-6 text-[0.88rem] text-foreground/75 md:flex"
        >
          <a href="#parcours" className="transition-colors hover:text-foreground">
            Le parcours
          </a>
          <a href="#tribunal" className="transition-colors hover:text-foreground">
            Le tribunal
          </a>
          <a href="#difference" className="transition-colors hover:text-foreground">
            La différence
          </a>
          <Link href="/verifier" className="transition-colors hover:text-foreground">
            Déjà vérifié ?
          </Link>
        </nav>
        <Link
          href="/"
          className="col-start-1 justify-self-start rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/40 md:col-start-2 md:justify-self-center"
        >
          <Logo name={publicEnv.NEXT_PUBLIC_APP_NAME} />
        </Link>
        <nav
          aria-label="Compte"
          className="col-start-3 flex items-center justify-end gap-1 [&_a]:whitespace-nowrap"
        >
          {signedIn ? (
            <Button asChild variant="solid" className="group/btn pr-1.5">
              <Link href={AFTER_SIGN_IN_PATH}>
                Ouvrir
                <span className="btn-swap size-7 rounded-full bg-background text-foreground">
                  <ArrowRight aria-hidden className="size-3.5" />
                  <ArrowRight aria-hidden className="size-3.5" />
                </span>
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" className="hidden sm:inline-flex">
                <Link href="/login">Se connecter</Link>
              </Button>
              <Button asChild variant="solid" className="group/btn pr-1.5">
                <Link href="/signup">
                  Créer un compte
                  <span className="btn-swap size-7 rounded-full bg-background text-foreground">
                    <ArrowRight aria-hidden className="size-3.5" />
                    <ArrowRight aria-hidden className="size-3.5" />
                  </span>
                </Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
