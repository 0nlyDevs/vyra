import type { FeedStatus } from '@/lib/domain';
import type { FeedItem } from '@/server/dal/feed';

// L'état d'une publication, du plus avancé au moins avancé : conclue, en vérification (une
// enquête est ouverte), signalée, sinon non vérifiée. Non vérifié ne veut pas dire faux.
export function feedStatusOf(
  item: Pick<FeedItem, 'case' | 'reporterCount' | 'reportState'>,
): FeedStatus {
  if (item.case?.status === 'concluded' && item.case.certainty) return 'concluded';
  if (item.case) return 'verifying';
  if (item.reportState === 'verifying' || item.reportState === 'concluded') return 'verifying';
  if (item.reporterCount > 0) return 'reported';
  return 'unverified';
}
