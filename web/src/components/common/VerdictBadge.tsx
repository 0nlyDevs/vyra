import { Check, CircleHelp, Info, TriangleAlert, X } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Tone } from '@/lib/domain';
import { cn } from '@/lib/utils';
import { LANDING_SHAPE, TAG_SHAPE } from './ToneBadge';

// La conclusion du juge, à l'identique dans l'application mobile et
// l'extension : étiquette pleine de la famille de verdict, avec son icône et son mot (jamais la
// couleur seule). « Informations insuffisantes » reste neutre.

const VERDICT = {
  success: { className: 'bg-verdict-true text-verdict-true-on', Icon: Check },
  info: { className: 'bg-verdict-unverifiable text-verdict-unverifiable-on', Icon: CircleHelp },
  warning: { className: 'bg-verdict-misleading text-verdict-misleading-on', Icon: TriangleAlert },
  danger: { className: 'bg-verdict-false text-verdict-false-on', Icon: X },
  neutral: { className: 'bg-muted text-foreground', Icon: Info },
} satisfies Record<Tone, { className: string; Icon: typeof Check }>;

// Sur l'accueil : l'ancienne pastille teintée, sans icône.
const LANDING_TINT = {
  success: '[.landing_&]:bg-success-soft [.landing_&]:text-success',
  info: '[.landing_&]:bg-info-soft [.landing_&]:text-info',
  warning: '[.landing_&]:bg-warning-soft [.landing_&]:text-warning',
  danger: '[.landing_&]:bg-danger-soft [.landing_&]:text-danger',
  neutral: '[.landing_&]:text-muted-foreground',
} satisfies Record<Tone, string>;

export function VerdictBadge({
  tone,
  className,
  children,
}: {
  tone: Tone;
  className?: string;
  children: ReactNode;
}) {
  const { className: colors, Icon } = VERDICT[tone];
  return (
    <span
      data-verdict={tone}
      className={cn(
        TAG_SHAPE,
        LANDING_SHAPE,
        colors,
        LANDING_TINT[tone],
        '[.landing_&_svg]:hidden',
        className,
      )}
    >
      <Icon aria-hidden />
      {children}
    </span>
  );
}
