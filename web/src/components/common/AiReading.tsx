import { EyeOff, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Ce que l'IA a lu, formulé ou déduit : encadré en pointillés, quand les faits (pièces, fichier,
 * règle de certitude) gardent un trait plein. En mode « Sans IA » (préférence de lecture), le
 * contenu est masqué par le CSS et seule une ligne le signale : pas de clignotement au chargement.
 */
export function AiReading({
  children,
  label = 'Lecture de l’IA',
  showLabel = true,
  className,
}: {
  children: ReactNode;
  label?: string;
  // Faux quand le titre du bloc dit déjà que c'est l'IA : le libellé ne sert qu'au mode Sans IA.
  showLabel?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('ai-reading', className)}>
      {showLabel && (
        <p className="flex items-center gap-1.5 text-muted-foreground text-xs">
          <Sparkles aria-hidden className="size-3.5" />
          {label}
        </p>
      )}
      {children}
      <p className="ai-reading-off items-center gap-2 text-muted-foreground text-sm">
        <EyeOff aria-hidden className="size-4 shrink-0" />
        <span>Masqué en mode Sans IA, qui n’affiche que les faits : {label}.</span>
      </p>
    </div>
  );
}
