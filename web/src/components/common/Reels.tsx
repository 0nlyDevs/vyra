'use client';

import { type CSSProperties, useSyncExternalStore } from 'react';
import type { CertaintyLevel } from '@/lib/domain';
import { CertaintyBadge } from './DomainBadges';

// Trois courtes vidéos muettes de ce qui circule, inclinées comme des cartes posées sur la table,
// chacune avec la conclusion qu'elle aurait reçue. Exemples inventés, sur des images d'archives
// libres (crédits dans public/reels/CREDITS.md). Pas sur téléphone. En mode éco, ou quand
// l'appareil demande moins d'animations, les cartes restent mais les vidéos ne jouent pas : on
// voit une image fixe.

const CLIPS: { src: string; certainty: CertaintyLevel; caption: string }[] = [
  {
    src: '/reels/marche-a.mp4',
    certainty: 'uncertain',
    caption: '« Le riz triple lundi »',
  },
  {
    src: '/reels/reel-rocade-nuit.mp4',
    certainty: 'contradicted',
    caption: '« Coupure générale ce soir »',
  },
  {
    src: '/reels/delestage-satellite.mp4',
    certainty: 'probable',
    caption: '« Le délestage vu de l’espace »',
  },
];

/** Vrai en mode éco, quand l'appareil demande moins d'animations, et côté serveur. */
function subscribe(onChange: () => void) {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ['data-eco'] });
  motion.addEventListener('change', onChange);
  return () => {
    observer.disconnect();
    motion.removeEventListener('change', onChange);
  };
}
function isStill() {
  return (
    document.documentElement.dataset.eco === 'on' ||
    matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function Reels() {
  const still = useSyncExternalStore(subscribe, isStill, () => true);
  return (
    <figure className="vreels rise hidden lg:block" style={{ '--d': '0.3s' } as CSSProperties}>
      <div className="vreels-stage" aria-hidden>
        {CLIPS.map((clip) => (
          <div key={clip.src} className="vreel">
            {/* La clé change avec le mode : la vidéo repart, ou s'arrête sur une image fixe. */}
            <video
              key={String(still)}
              src={still ? `${clip.src}#t=1` : clip.src}
              autoPlay={!still}
              muted
              loop
              playsInline
              preload="metadata"
            />
            <span className="vreel-badge">
              <CertaintyBadge level={clip.certainty} />
            </span>
            <span className="vreel-cap">{clip.caption}</span>
          </div>
        ))}
      </div>
      <figcaption className="mt-4 flex justify-between gap-4 text-muted-foreground text-sm">
        <span>Ce qui circule, et ce qu’on en conclut. Exemples inventés.</span>
        <a
          href="/reels/CREDITS.md"
          target="_blank"
          rel="noreferrer"
          className="shrink-0 underline-offset-4 hover:text-foreground hover:underline"
        >
          Crédits des images
        </a>
      </figcaption>
    </figure>
  );
}
