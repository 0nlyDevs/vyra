import type { CSSProperties } from 'react';
import type { CertaintyLevel } from '@/lib/domain';
import { CertaintyBadge } from './DomainBadges';

// Trois courtes vidéos muettes de ce qui circule, inclinées comme des cartes posées sur la table,
// chacune avec la conclusion qu'elle aurait reçue. Exemples inventés, sur des images d'archives
// libres (crédits dans public/reels/CREDITS.md). Décor seulement : pas sur téléphone, ni en mode
// éco, ni quand l'appareil demande moins d'animations.

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

export function Reels() {
  return (
    <figure className="vreels rise hidden lg:block" style={{ '--d': '0.3s' } as CSSProperties}>
      <div className="vreels-stage" aria-hidden>
        {CLIPS.map((clip) => (
          <div key={clip.src} className="vreel">
            <video src={clip.src} autoPlay muted loop playsInline preload="metadata" />
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
