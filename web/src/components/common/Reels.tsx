'use client';

import { Info } from 'lucide-react';
import { type CSSProperties, useSyncExternalStore } from 'react';
import type { CertaintyLevel } from '@/lib/domain';
import { CertaintyBadge } from './DomainBadges';

// Trois courtes vidéos muettes de ce qui circule, posées comme des stories : la plateforme, la
// conclusion qu'elles auraient reçue, la phrase qui circule. Exemples inventés, sur des images
// d'archives libres (crédits dans public/reels/CREDITS.md). Inclinées en éventail sur ordinateur,
// en bande à faire glisser sur téléphone. En mode éco, ou quand l'appareil demande moins
// d'animations, les vidéos ne jouent pas : chaque carte montre une image fixe.

const CLIPS: { src: string; origin: string; certainty: CertaintyLevel; quote: string }[] = [
  {
    src: '/reels/marche-a.mp4',
    origin: 'WhatsApp · groupe Famille',
    certainty: 'uncertain',
    quote: 'Le riz triple lundi',
  },
  {
    src: '/reels/reel-rocade-nuit.mp4',
    origin: 'Facebook · 4 200 partages',
    certainty: 'contradicted',
    quote: 'Coupure générale ce soir',
  },
  {
    src: '/reels/delestage-satellite.mp4',
    origin: 'TikTok · 12 000 vues',
    certainty: 'probable',
    quote: 'Le délestage vu de l’espace',
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
    <figure className="vreels rise" style={{ '--d': '0.3s' } as CSSProperties}>
      <div className="vreels-stage">
        {CLIPS.map((clip) => (
          <div key={clip.src} className="vreel" aria-hidden>
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
            <span className="vreel-bars">
              <span className="vreel-bar" />
              <span className="vreel-bar" />
              <span className="vreel-bar" />
            </span>
            <span className="vreel-badge">
              <CertaintyBadge level={clip.certainty} />
            </span>
            <span className="vreel-foot">
              <span className="vreel-origin">{clip.origin}</span>
              <span className="vreel-quote">« {clip.quote} »</span>
            </span>
          </div>
        ))}
      </div>
      <figcaption className="sr-only">
        Trois exemples inventés de messages qui circulent, avec la conclusion qu’ils auraient reçue.
      </figcaption>
      <a
        href="/reels/CREDITS.md"
        target="_blank"
        rel="noreferrer"
        className="vreels-credit"
        title="Crédits des images (Wikimedia Commons)"
        aria-label="Crédits des images (Wikimedia Commons)"
      >
        <Info aria-hidden className="size-4" />
      </a>
    </figure>
  );
}
