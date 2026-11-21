import { ToneBadge } from '@/components/common/ToneBadge';
import { SOURCE_KIND_LABELS, SOURCE_KIND_TONES } from '@/lib/domain';
import { sourceKind } from './source-kind';

// Le type de la source (vérificateur, presse reconnue, forum, réseau social…), déduit de son
// adresse ou de son nom. Un indice sur la source, pas un verdict sur ce qu'elle dit.
export function SourceKindBadge({
  source,
  className,
}: {
  source: { sourceUrl: string | null; sourceName: string };
  className?: string;
}) {
  const kind = sourceKind(source.sourceUrl, source.sourceName);
  if (kind === 'unknown') return null;
  return (
    <ToneBadge tone={SOURCE_KIND_TONES[kind]} className={className}>
      {SOURCE_KIND_LABELS[kind]}
    </ToneBadge>
  );
}
