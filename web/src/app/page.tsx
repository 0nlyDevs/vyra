import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { LogoMark } from '@/components/brand/Logo';
import { Button } from '@/components/ui/button';
import { Comparison } from '@/features/landing/Comparison';
import { CourtShowcase } from '@/features/landing/CourtShowcase';
import { FeatureBento } from '@/features/landing/FeatureBento';
import { Hero } from '@/features/landing/Hero';
import { LandingNav } from '@/features/landing/LandingNav';
import { Manifesto } from '@/features/landing/Manifesto';
import { SourcesMarquee } from '@/features/landing/SourcesMarquee';
import { AFTER_SIGN_IN_PATH } from '@/lib/navigation';
import { getCurrentProfile } from '@/server/session';

// Page d'accueil publique : le premier écran du pitch. Toujours en thème nuit (direction
// « Nuit rouge », reprise du site Kovity), quel que soit le thème choisi dans l'application.
export default async function HomePage() {
  const signedIn = Boolean(await getCurrentProfile());

  return (
    <div className="dark min-h-[100dvh] overflow-x-clip bg-background text-foreground">
      <LandingNav signedIn={signedIn} />
      <main>
        <Hero signedIn={signedIn} />
        <Manifesto />
        <FeatureBento />
        <SourcesMarquee />
        <CourtShowcase />
        <Comparison />

        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-[-40%] mx-auto aspect-square max-w-[70rem] rounded-full bg-[radial-gradient(closest-side,oklch(0.6_0.23_24/0.35),oklch(0.4_0.16_24/0.12)_55%,transparent)]"
          />
          <div className="relative mx-auto grid max-w-[84rem] justify-items-center gap-8 px-5 py-32 text-center lg:px-10">
            <LogoMark className="size-12" />
            <h2 className="display max-w-[16ch] text-[clamp(2.2rem,5.4vw,4.6rem)]">
              Vérifier avant de partager.
            </h2>
            <p className="max-w-[44ch] text-[1.05rem] text-muted-foreground">
              Quelques clics suffisent pour savoir d’où vient une information, et ce qu’elle vaut.
            </p>
            <Button asChild variant="solid" size="lg" className="group/btn pr-1.5">
              <Link href={signedIn ? AFTER_SIGN_IN_PATH : '/signup'}>
                {signedIn ? 'Ouvrir MindStack' : 'Créer un compte'}
                <span className="btn-swap size-8 rounded-full bg-background text-foreground">
                  <ArrowRight aria-hidden className="size-4" />
                  <ArrowRight aria-hidden className="size-4" />
                </span>
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <footer className="border-t">
        <div className="mx-auto flex max-w-[84rem] flex-wrap items-center justify-between gap-3 px-5 py-8 text-muted-foreground text-sm lg:px-10">
          <span>Équipe MindStack · DevFest Antananarivo 2026</span>
          <Link href="/login" className="link-arrow">
            Se connecter
            <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        </div>
      </footer>
    </div>
  );
}
