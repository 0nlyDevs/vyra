import { CircleDashed, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Tone } from '@/lib/domain';
import { cn } from '@/lib/utils';
import { TAG_SHAPE } from './ToneBadge';

// Le niveau d'un signe d'alerte (ton, danger) : à l'encre, jamais une couleur ni une icône de
// verdict, car il ne dit rien de la vérité. Le même dans l'application mobile et l'extension :
// cadre d'encre et avertissement quand des signes sont relevés, gris sinon.
export function SignalBadge({
  tone,
  className,
  children,
}: {
  tone: Tone;
  className?: string;
  children: ReactNode;
}) {
  const alert = tone === 'warning' || tone === 'danger';
  const Icon = alert ? TriangleAlert : CircleDashed;
  return (
    <span
      data-signal={alert ? 'alert' : 'calm'}
      className={cn(
        TAG_SHAPE,
        alert
          ? 'border border-foreground bg-card text-foreground'
          : 'bg-muted text-muted-foreground',
        className,
      )}
    >
      <Icon aria-hidden />
      {children}
    </span>
  );
}
