'use client';

import { ArrowLeft, Check } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type CSSProperties, type ReactNode, useSyncExternalStore } from 'react';
import { Logo } from '@/components/brand/Logo';
import { ReadingControls } from '@/components/shell/ReadingControls';
import { ThemeToggle } from '@/components/shell/ThemeToggle';
import { useSlidingPill } from '@/lib/use-sliding-pill';

// Les portes de l'application, comme chez Checky : à gauche, une rédaction en vidéo sur un fond
// d'encre (dans les deux thèmes) avec la promesse du produit ; à droite, le formulaire, sous un
// interrupteur dont la pilule d'encre glisse entre « Se connecter » et « Créer un compte ».
// `appName` vient de la mise en page (serveur) : `lib/env.ts` ne se lit pas dans le navigateur.

const HERO = {
  in: ['Voir d’où vient', 'une *information*.'],
  up: ['Avant de partager,', 'on *vérifie*.'],
};
const LEAD = 'Retrouvez l’histoire d’une information, version par version, et jugez-la sur pièces.';
const POINTS = [
  'L’histoire d’une information, version par version, avec ses sources.',
  'Deux IA plaident, vous votez, le juge conclut sur pièces.',
  '« Informations insuffisantes » quand les preuves manquent.',
];
const DOORS = [
  { href: '/login', label: 'Se connecter' },
  { href: '/signup', label: 'Créer un compte' },
];

/** Vrai en mode éco, avec « animations réduites » et côté serveur : la vidéo reste alors éteinte. */
function useStill(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () =>
      document.documentElement.dataset.eco === 'on' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => true,
  );
}

/** Une ligne de titre avec son *mot* dans l'italique de l'accueil. */
function Em({ text }: { text: string }) {
  const parts = text.split('*');
  return (
    <>
      {parts.map((part, i) =>
        // biome-ignore lint/suspicious/noArrayIndexKey: morceaux fixes d'une phrase écrite dans le code.
        i % 2 ? <em key={i}>{part}</em> : <span key={i}>{part}</span>,
      )}
    </>
  );
}

export function AuthShell({ appName, children }: { appName: string; children: ReactNode }) {
  const pathname = usePathname();
  const up = pathname.startsWith('/signup');
  const current = DOORS.findIndex((door) => pathname.startsWith(door.href));

  return (
    <div className="auth-doors bg-background text-foreground">
      <Side up={up} appName={appName} />
      <section className="auth-panel">
        <div className="auth-top">
          <Link
            href="/verifier"
            className="group inline-flex h-10 items-center gap-2 rounded-full px-1 font-bold text-foreground text-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft
              className="size-4 transition-transform duration-300 group-hover:-translate-x-0.5"
              aria-hidden
            />
            Vérifier sans compte
          </Link>
          <div className="flex items-center gap-1.5">
            <ReadingControls className="hidden sm:flex" />
            <ThemeToggle />
          </div>
        </div>
        <main className="auth-box">
          {current >= 0 && <Doors current={current} />}
          {children}
        </main>
        <p className="auth-made">{appName}, né au DevFest Antananarivo 2026.</p>
      </section>
    </div>
  );
}

/** La vidéo et la promesse : le studio de radio pour se connecter, un plateau pour s'inscrire. */
function Side({ up, appName }: { up: boolean; appName: string }) {
  const still = useStill();
  const lines = up ? HERO.up : HERO.in;
  return (
    <aside className="auth-side dark" aria-label={`${appName} en bref`}>
      {!still && (
        <video
          key={up ? 'up' : 'in'}
          className="auth-video"
          src={up ? '/auth/tv-reportage.mp4' : '/auth/studio-radio.mp4'}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden
        />
      )}
      <div className="auth-shade" aria-hidden />
      <Link href="/" className="auth-word">
        <Logo name={appName} />
      </Link>
      <div className="auth-promise">
        <h2 className="lines pub-display auth-title">
          {lines.map((line, i) => (
            <span key={line}>
              <span style={{ '--l': i } as CSSProperties}>
                <Em text={line} />
              </span>
            </span>
          ))}
        </h2>
        {up ? (
          <ul className="rise auth-points" style={{ '--d': '0.3s' } as CSSProperties}>
            {POINTS.map((point) => (
              <li key={point}>
                <Check className="size-5 shrink-0" aria-hidden />
                {point}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rise auth-lead" style={{ '--d': '0.3s' } as CSSProperties}>
            {LEAD}
          </p>
        )}
        <a href="/auth/CREDITS.md" target="_blank" rel="noreferrer" className="auth-credits">
          Vidéo : Wikimedia Commons
        </a>
      </div>
    </aside>
  );
}

/** Se connecter · Créer un compte : la pilule d'encre sous la porte ouverte. */
function Doors({ current }: { current: number }) {
  const { host, pill, handlers } = useSlidingPill<HTMLElement>(current);
  return (
    <nav ref={host} aria-label="Accès au compte" className="seg seg-lg seg-fill" {...handlers}>
      <span ref={pill} className="seg-pill" aria-hidden />
      {DOORS.map((door, i) => (
        <Link
          key={door.href}
          href={door.href}
          className="seg-item"
          data-pill-item
          data-current={i === current || undefined}
          aria-current={i === current ? 'page' : undefined}
        >
          {door.label}
        </Link>
      ))}
    </nav>
  );
}
