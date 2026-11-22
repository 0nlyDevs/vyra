import type { ReactNode } from 'react';
import type { Tone } from '@/lib/domain';
import { cn } from '@/lib/utils';

// Badge coloré selon un ton (succès, info, attention, danger, neutre). C'est LE badge d'état de
// l'application : les badges métier (état d'une affaire, pièce…) passent tous par lui. Même
// forme dans l'application mobile et l'extension : étiquette de 6 px sur la teinte du ton.
// Les conclusions du juge ont leur propre badge, plein (VerdictBadge), et les signes d'alerte le
// leur, à l'encre (SignalBadge). L'accueil garde sa pastille ronde.

const TONE_CLASSES = {
  success: 'bg-success-soft text-success',
  info: 'bg-info-soft text-info',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-muted text-muted-foreground',
} satisfies Record<Tone, string>;

export const TAG_SHAPE =
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-[6px] px-2 py-0.5 font-semibold text-xs [&_svg]:size-3.5 [&_svg]:shrink-0';
// L'accueil (« Nuit rouge ») ne change pas : pastille ronde, sans icône de verdict.
export const LANDING_SHAPE =
  '[.landing_&]:rounded-full [.landing_&]:px-2.5 [.landing_&]:font-medium [.landing_&]:shadow-[inset_0_0_0_1px_color-mix(in_oklch,currentColor_14%,transparent)]';

export function ToneBadge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span data-tone={tone} className={cn(TAG_SHAPE, LANDING_SHAPE, TONE_CLASSES[tone], className)}>
      {children}
    </span>
  );
}
