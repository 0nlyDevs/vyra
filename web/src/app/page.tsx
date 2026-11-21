import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Comparison } from '@/features/landing/Comparison';
import { FeatureBento } from '@/features/landing/FeatureBento';
import { HearingPreview } from '@/features/landing/HearingPreview';
import { LandingNav } from '@/features/landing/LandingNav';
import { getCurrentProfile } from '@/server/session';

const ENTER =
  'animate-in fade-in slide-in-from-bottom-3 fill-mode-both duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:animate-none';

// Page d'accueil publique : le premier écran du pitch.
export default async function HomePage() {
  const signedIn = Boolean(await getCurrentProfile());

  return (
    <div className="min-h-[100dvh]">
      <LandingNav signedIn={signedIn} />
      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pt-16 pb-20 md:pt-24 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="grid gap-6">
            <h1
              className={`text-balance font-semibold text-4xl leading-[1.08] tracking-tight md:text-5xl lg:text-[3.1rem] ${ENTER}`}
            >
              Une info douteuse ? Faites-la juger.
            </h1>
            <p
              className={`max-w-[48ch] text-lg text-muted-foreground [animation-delay:100ms] ${ENTER}`}
            >
              Voyez d’où elle vient, écoutez les deux camps, puis concluez seulement quand les
              preuves le permettent.
            </p>
            <div className={`flex flex-wrap gap-3 [animation-delay:200ms] ${ENTER}`}>
              <Button asChild size="lg">
                <Link href="/signup">
                  Créer un compte
                  <ArrowRight aria-hidden data-icon="inline-end" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login#demo">Voir la démo</Link>
              </Button>
            </div>
          </div>
          <HearingPreview />
        </section>

        <FeatureBento />
        <Comparison />

        <section className="mx-auto grid max-w-6xl justify-items-start gap-6 px-6 py-20">
          <h2 className="max-w-2xl font-semibold text-3xl md:text-4xl">
            Vérifier avant de partager, en quelques clics.
          </h2>
          <Button asChild size="lg">
            <Link href="/signup">
              Créer un compte
              <ArrowRight aria-hidden data-icon="inline-end" />
            </Link>
          </Button>
        </section>
      </main>
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-muted-foreground text-sm">
          <span>Équipe MindStack, DevFest Antananarivo 2026</span>
          <Link href="/login" className="underline-offset-4 hover:underline">
            Se connecter
          </Link>
        </div>
      </footer>
    </div>
  );
}
