'use client';

import { Leaf } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Confort de lecture, gardé sur cet appareil : taille du texte (A− / A+) et mode éco (moins
// d'animations et d'effets, pour les petits téléphones et les connexions lentes). Le script de
// `READING_PREFERENCES_SCRIPT` les applique avant l'affichage, sans clignotement.

export const TEXT_SIZES = ['small', 'normal', 'large', 'xlarge'] as const;
type TextSize = (typeof TEXT_SIZES)[number];
const TEXT_KEY = 'reading-text-size';
const ECO_KEY = 'reading-eco';

export const READING_PREFERENCES_SCRIPT = `try{var d=document.documentElement,t=localStorage.getItem('${TEXT_KEY}');if(t)d.dataset.text=t;if(localStorage.getItem('${ECO_KEY}')==='on')d.dataset.eco='on'}catch(e){}`;

function save(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Stockage indisponible (navigation privée) : le réglage vaut pour cette page seulement.
  }
}

export function ReadingControls({ className }: { className?: string }) {
  const [size, setSize] = useState<TextSize>('normal');
  const [eco, setEco] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const stored = root.dataset.text as TextSize | undefined;
    if (stored && TEXT_SIZES.includes(stored)) setSize(stored);
    setEco(root.dataset.eco === 'on');
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

  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Réduire la taille du texte"
        disabled={size === TEXT_SIZES[0]}
        onClick={() => changeSize(-1)}
        className="font-semibold text-xs"
      >
        A−
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Agrandir la taille du texte"
        disabled={size === TEXT_SIZES[TEXT_SIZES.length - 1]}
        onClick={() => changeSize(1)}
        className="font-semibold"
      >
        A+
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Mode éco : moins d’animations et d’effets"
        aria-pressed={eco}
        title="Mode éco : moins d’animations et d’effets"
        onClick={toggleEco}
        className={cn(eco && 'bg-success-soft text-success')}
      >
        <Leaf aria-hidden />
      </Button>
    </div>
  );
}
