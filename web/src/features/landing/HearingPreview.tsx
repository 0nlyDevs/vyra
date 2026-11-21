import { CertaintyBadge, EvidenceStanceBadge } from '@/components/common/DomainBadges';
import { SpeechBubble } from '@/components/common/SpeechBubble';
import { cn } from '@/lib/utils';

// Aperçu d'une audience, fait avec les vrais composants du tribunal (pas une capture figée).
// Textes repris de l'affaire de démo « La photo de l'inondation » (lieux et médias inventés).

const ENTER =
  'animate-in fade-in slide-in-from-bottom-3 fill-mode-both duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:animate-none';

export function HearingPreview() {
  return (
    <div className="relative grid gap-3 p-5 sm:p-7">
      <div className={cn('grid gap-1', ENTER)}>
        <p className="text-muted-foreground text-xs">L’information jugée</p>
        <p className="text-pretty font-medium leading-snug">
          « URGENT : inondation ce matin à Ambohitsoa-Nord, 3 morts, l’école est fermée. »
        </p>
      </div>
      <div className={cn('[animation-delay:150ms]', ENTER)}>
        <SpeechBubble speaker="Accusation" caption="IA" tone="warning">
          La photo a été publiée le 12 mars 2019 (pièce n° 1). La mairie dit que l’école est ouverte
          (pièce n° 3).
        </SpeechBubble>
      </div>
      <div className={cn('[animation-delay:300ms]', ENTER)}>
        <SpeechBubble speaker="Défense" caption="IA" tone="info" side="end">
          Il a bien plu cette nuit (pièce n° 4). Je n’ai rien pour les victimes.
        </SpeechBubble>
      </div>
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-3 rounded-xl bg-foreground/[0.04] px-4 py-3 [animation-delay:450ms]',
          ENTER,
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-sm">Conclusion</span>
          <CertaintyBadge level="contradicted" />
        </div>
        <div className="flex gap-1.5">
          <EvidenceStanceBadge stance="contradicts" />
          <EvidenceStanceBadge stance="context" />
        </div>
      </div>
    </div>
  );
}
