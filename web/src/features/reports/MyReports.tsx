import Link from 'next/link';
import { ToneBadge } from '@/components/common/ToneBadge';
import { EmptyState } from '@/components/states/States';
import { REPORT_REASON_LABELS, REPORT_STATE_LABELS, REPORT_STATE_TONES } from '@/lib/domain';
import { formatDateTime } from '@/lib/format';
import type { ReportListItem } from '@/server/dal/reports';

// « Mes signalements » : chaque contenu signalé, où il en est, et son affaire quand elle existe.
export function MyReports({ items }: { items: ReportListItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Aucun signalement pour l’instant."
        description="Vos signalements apparaîtront ici, avec leur avancement."
      />
    );
  }

  return (
    <ul className="grid divide-y">
      {items.map((item) => (
        <li key={item.id} className="grid gap-1.5 py-4 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="font-medium">{item.groupTitle}</p>
            <ToneBadge tone={REPORT_STATE_TONES[item.state]}>
              {REPORT_STATE_LABELS[item.state]}
            </ToneBadge>
          </div>
          <p className="text-muted-foreground text-sm">
            {REPORT_REASON_LABELS[item.reason]} · {formatDateTime(item.createdAt)} ·{' '}
            <span className="tabular-nums">
              {item.reporterCount} signaleur{item.reporterCount > 1 ? 's' : ''}
            </span>
          </p>
          {item.caseId && (
            <Link
              href={`/cases/${item.caseId}`}
              className="justify-self-start text-primary text-sm underline-offset-4 hover:underline"
            >
              Voir l’affaire
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
