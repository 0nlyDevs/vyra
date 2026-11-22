'use client';

import { Leaf, Palette } from 'lucide-react';
import Link from 'next/link';
import { READING_LABELS, useReadingPreferences } from './ReadingControls';
import { ThemeFace, useThemeFlip } from './ThemeToggle';

/**
 * En bas à gauche : les préférences, un seul objet flottant (thème, taille du texte, mode éco,
 * puis le kit d'interface). Chaque libellé sort à droite au survol et au focus. Sous 640 px, le
 * dock part : tout est dans le menu de l'avatar.
 */
export function PreferenceDock({ kitHref }: { kitHref?: string }) {
  const flip = useThemeFlip();
  const { eco, canShrink, canGrow, changeSize, toggleEco } = useReadingPreferences();
  return (
    <div className="dock" role="toolbar" aria-label="Préférences" aria-orientation="vertical">
      <button type="button" className="dock-btn" data-ripple onClick={flip}>
        <ThemeFace flag />
      </button>
      <button
        type="button"
        className="dock-btn"
        data-ripple
        disabled={!canGrow}
        onClick={() => changeSize(1)}
        aria-label={READING_LABELS.larger}
      >
        <span
          className="dock-icon grid place-items-center font-bold font-display text-sm"
          aria-hidden
        >
          A+
        </span>
        <span className="dock-flag" aria-hidden>
          Agrandir le texte
        </span>
      </button>
      <button
        type="button"
        className="dock-btn"
        data-ripple
        disabled={!canShrink}
        onClick={() => changeSize(-1)}
        aria-label={READING_LABELS.smaller}
      >
        <span
          className="dock-icon grid place-items-center font-bold font-display text-sm"
          aria-hidden
        >
          A−
        </span>
        <span className="dock-flag" aria-hidden>
          Réduire le texte
        </span>
      </button>
      <button
        type="button"
        className="dock-btn"
        data-ripple
        aria-pressed={eco}
        onClick={toggleEco}
        aria-label={READING_LABELS.eco}
      >
        <Leaf className="dock-icon" aria-hidden />
        <span className="dock-flag" aria-hidden>
          {eco ? 'Mode éco activé' : 'Mode éco'}
        </span>
      </button>
      {kitHref && (
        <>
          <span className="dock-sep" aria-hidden />
          <Link href={kitHref} className="dock-btn dock-opt">
            <Palette className="dock-icon" aria-hidden />
            <span className="dock-flag">Kit d’interface</span>
          </Link>
        </>
      )}
    </div>
  );
}
