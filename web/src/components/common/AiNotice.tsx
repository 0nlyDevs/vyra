import { Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Mention obligatoire sous toute conclusion produite avec l'IA.
export function AiNotice({
  className,
  children = 'Analyse assistée par IA. Ce n’est pas une décision officielle.',
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <p
      className={cn(
        'flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-muted-foreground text-sm',
        className,
      )}
    >
      <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
