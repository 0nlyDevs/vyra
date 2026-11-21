import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Bulle de parole : plaidoirie d'un avocat, témoin, message d'un personnage, réponse du joueur.
// `side="end"` aligne la bulle à droite (la personne qui utilise l'application).

const BUBBLE_TONES = {
  neutral: 'bg-muted text-foreground',
  primary: 'bg-accent text-accent-foreground',
  info: 'bg-info-soft text-foreground',
  success: 'bg-success-soft text-foreground',
  warning: 'bg-warning-soft text-foreground',
} as const;

export type BubbleTone = keyof typeof BUBBLE_TONES;

export function SpeechBubble({
  speaker,
  caption,
  tone = 'neutral',
  side = 'start',
  children,
}: {
  speaker: string;
  caption?: string;
  tone?: BubbleTone;
  side?: 'start' | 'end';
  children: ReactNode;
}) {
  return (
    <div className={cn('flex', side === 'end' ? 'justify-end' : 'justify-start')}>
      <div className={cn('grid max-w-[80%] gap-1 rounded-2xl px-4 py-3', BUBBLE_TONES[tone])}>
        <p className="font-medium text-sm">
          {speaker}
          {caption && <span className="font-normal text-muted-foreground"> · {caption}</span>}
        </p>
        <div className="text-pretty leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
