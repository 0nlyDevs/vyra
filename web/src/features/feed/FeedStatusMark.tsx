import { CertaintyBadge } from '@/components/common/DomainBadges';
import { ToneBadge } from '@/components/common/ToneBadge';
import {
  FEED_STATUS_LABELS,
  FEED_STATUS_TONES,
  type FeedStatus,
  REPORT_CASE_THRESHOLD,
} from '@/lib/domain';
import type { FeedItem } from '@/server/dal/feed';

// L'état d'une publication, dit seulement quand il y a quelque chose à dire. « Non vérifié » est
// l'état de départ de presque tout le fil : le répéter partout ne montre plus rien. Une conclusion
// du tribunal montre son niveau de certitude ; une publication signalée, combien de personnes.
export function FeedStatusMark({ item, status }: { item: FeedItem; status: FeedStatus }) {
  if (status === 'unverified') return null;
  if (status === 'concluded' && item.case?.certainty) {
    return <CertaintyBadge level={item.case.certainty} />;
  }
  return (
    <ToneBadge tone={FEED_STATUS_TONES[status]}>
      {FEED_STATUS_LABELS[status]}
      {status === 'reported' && (
        <span className="tabular-nums">
          {' '}
          · {item.reporterCount} sur {REPORT_CASE_THRESHOLD}
        </span>
      )}
    </ToneBadge>
  );
}
