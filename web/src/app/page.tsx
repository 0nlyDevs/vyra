import { Comparison } from '@/features/landing/Comparison';
import { Fin } from '@/features/landing/Fin';
import { Hero } from '@/features/landing/Hero';
import { LandingMotion } from '@/features/landing/LandingMotion';
import { LandingChrome } from '@/features/landing/rail/LandingChrome';
import '@/features/landing/rail/rail.css';
import '@/features/landing/landing.css';
import { Parcours } from '@/features/landing/Parcours';
import { SourcesMarquee } from '@/features/landing/SourcesMarquee';
import { Tribunal } from '@/features/landing/Tribunal';
import { Verdict } from '@/features/landing/Verdict';
import { getCurrentProfile } from '@/server/session';

// Page d'accueil publique : le premier écran du pitch. Toujours en thème nuit (direction
// « Nuit rouge », reprise du site Kovity), quel que soit le thème choisi dans l'application.
export default async function HomePage() {
  const signedIn = Boolean(await getCurrentProfile());

  return (
    <div className="landing dark min-h-[100dvh] overflow-x-clip bg-background text-foreground">
      <LandingMotion />
      <LandingChrome />
      <main>
        <Hero signedIn={signedIn} />
        <Parcours />
        <SourcesMarquee />
        <Tribunal />
        <Verdict />
        <Comparison />
      </main>
      <Fin signedIn={signedIn} />
      {/* Le grain de « Nuit rouge » ne couvre que l'accueil. */}
      <div className="grain" aria-hidden />
    </div>
  );
}
