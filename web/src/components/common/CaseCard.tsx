import Link from 'next/link';
import {
  CASE_KIND_LABELS,
  type CaseKind,
  type CaseStatus,
  type CertaintyLevel,
} from '@/lib/domain';
import { CaseStatusBadge, CertaintyBadge } from './DomainBadges';
import { ToneBadge } from './ToneBadge';

// Résumé cliquable d'une affaire. `href` : la page à ouvrir (enquête, audience…).
export function CaseCard({
  item,
  href,
}: {
  item: {
    title: string;
    claim: string;
    kind: CaseKind;
    status: CaseStatus;
    certainty: CertaintyLevel | null;
  };
  href: string;
}) {
  return (
    <Link
      href={href}
      className="grid gap-2 surface p-5 outline-none transition-[transform,box-shadow,border-color] duration-400 ease-[cubic-bezier(.22,1,.36,1)] hover:-translate-y-[3px] hover:border-input hover:shadow-[var(--shadow-float)] focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="mr-auto font-bold">{item.title}</h3>
        {item.kind === 'fictional' && <ToneBadge>{CASE_KIND_LABELS.fictional}</ToneBadge>}
        {item.certainty ? (
          <CertaintyBadge level={item.certainty} />
        ) : (
          <CaseStatusBadge status={item.status} />
        )}
      </div>
      <p className="quote line-clamp-2 text-[1.05rem] text-muted-foreground">« {item.claim} »</p>
    </Link>
  );
}
