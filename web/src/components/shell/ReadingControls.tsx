'use client';

import { BotOff, Leaf } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

// Confort de lecture, gardé sur cet appareil : taille du texte (A− / A+), mode éco (moins
// d'animations et d'effets, pour les petits téléphones et les connexions lentes) et mode Sans IA
// (les lectures de l'IA masquées, voir AiReading : il ne reste que les faits). Le script de
// `READING_PREFERENCES_SCRIPT` les applique avant l'affichage, sans clignotement.

export const TEXT_SIZES = ['small', 'normal', 'large', 'xlarge'] as const;
type TextSize = (typeof TEXT_SIZES)[number];
const TEXT_KEY = 'reading-text-size';
const ECO_KEY = 'reading-eco';
const NO_AI_KEY = 'reading-no-ai';

export const READING_PREFERENCES_SCRIPT = `try{var d=document.documentElement,t=localStorage.getItem('${TEXT_KEY}');if(t)d.dataset.text=t;if(localStorage.getItem('${ECO_KEY}')==='on')d.dataset.eco='on';if(localStorage.getItem('${NO_AI_KEY}')==='on')d.dataset.noAi='on'}catch(e){}`;

export const READING_LABELS = {
  smaller: 'Réduire la taille du texte',
  larger: 'Agrandir la taille du texte',
  eco: 'Mode éco : moins d’animations et d’effets',
  noAi: 'Sans IA : n’afficher que les faits',
} as const;

function save(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Stockage indisponible (navigation privée) : le réglage vaut pour cette page seulement.
  }
}

/** La taille du texte, le mode éco et le mode Sans IA de cet appareil, et de quoi les changer. */
export function useReadingPreferences() {
  const [size, setSize] = useState<TextSize>('normal');
  const [eco, setEco] = useState(false);
  const [noAi, setNoAi] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const stored = root.dataset.text as TextSize | undefined;
    if (stored && TEXT_SIZES.includes(stored)) setSize(stored);
    setEco(root.dataset.eco === 'on');
    setNoAi(root.dataset.noAi === 'on');
  }, []);

  function changeSize(step: -1 | 1) {
    const next = TEXT_SIZES[TEXT_SIZES.indexOf(size) + step];
    if (!next) return;
    setSize(next);
    document.documentElement.dataset.text = next;
    save(TEXT_KEY, next === 'normal' ? null : next);
  }

  function toggleEco() {
    const next = !eco;
    setEco(next);
    if (next) document.documentElement.dataset.eco = 'on';
    else delete document.documentElement.dataset.eco;
    save(ECO_KEY, next ? 'on' : null);
  }

  function toggleNoAi() {
    const next = !noAi;
    setNoAi(next);
    if (next) document.documentElement.dataset.noAi = 'on';
    else delete document.documentElement.dataset.noAi;
    save(NO_AI_KEY, next ? 'on' : null);
  }

  return {
    eco,
    noAi,
    canShrink: size !== TEXT_SIZES[0],
    canGrow: size !== TEXT_SIZES[TEXT_SIZES.length - 1],
    changeSize,
    toggleEco,
    toggleNoAi,
  };
}

/** A− A+, le mode éco et le mode Sans IA, en un groupe de boutons ronds (barre publique, pages de compte). */
export function ReadingControls({ className }: { className?: string }) {
  const { eco, noAi, canShrink, canGrow, changeSize, toggleEco, toggleNoAi } =
    useReadingPreferences();

  return (
    <div className={cn('site-round-group', className)}>
      <button
        type="button"
        className="site-round"
        aria-label={READING_LABELS.smaller}
        disabled={!canShrink}
        onClick={() => changeSize(-1)}
      >
        A−
      </button>
      <button
        type="button"
        className="site-round"
        aria-label={READING_LABELS.larger}
        disabled={!canGrow}
        onClick={() => changeSize(1)}
      >
        A+
      </button>
      <button
        type="button"
        className="site-round"
        aria-label={READING_LABELS.eco}
        aria-pressed={eco}
        title={READING_LABELS.eco}
        onClick={toggleEco}
      >
        <Leaf aria-hidden className="size-4" />
      </button>
      <button
        type="button"
        className="site-round"
        aria-label={READING_LABELS.noAi}
        aria-pressed={noAi}
        title={READING_LABELS.noAi}
        onClick={toggleNoAi}
      >
        <BotOff aria-hidden className="size-4" />
      </button>
    </div>
  );
}
