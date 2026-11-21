import type { ReactNode } from 'react';
import type { Tone } from '@/lib/domain';
import { cn } from '@/lib/utils';

// Badge coloré selon un ton (succès, info, attention, danger, neutre). C'est LE badge d'état de
// l'application : les badges métier (certitude, état d'une affaire…) passent tous par lui.

const TONE_CLASSES = {
  success: 'bg-success-soft text-success',
  info: 'bg-info-soft text-info',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-muted text-muted-foreground',
} satisfies Record<Tone, string>;

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
    <span
      data-tone={tone}
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 font-medium text-xs shadow-[inset_0_0_0_1px_color-mix(in_oklch,currentColor_14%,transparent)] [&_svg]:size-3.5',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
