import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { ToneBadge } from '@/components/common/ToneBadge';
import { EmptyState } from '@/components/states/States';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  REPORT_CASE_THRESHOLD,
  REPORT_REASON_LABELS,
  REPORT_STATE_LABELS,
  REPORT_STATE_TONES,
} from '@/lib/domain';
import { formatDateTime } from '@/lib/format';
import type { GroupReportItem, ReportGroupListItem } from '@/server/dal/reports';
import { OpenCaseButton } from './OpenCaseButton';

// Vue du vérificateur : un groupe par contenu signalé, du plus signalé au moins signalé, avec
// l'avancement vers le seuil et les formulations reçues (le regroupement se voit).
export function ReportGroups({
  groups,
  reports,
}: {
  groups: ReportGroupListItem[];
  reports: GroupReportItem[];
}) {
  if (groups.length === 0) {
    return (
      <EmptyState
        title="Aucune alerte pour l’instant."
        description="Les contenus signalés apparaîtront ici, regroupés par contenu."
      />
    );
  }

  return (
    <ul className="divide-y rounded-xl border bg-card">
      {groups.map((group) => {
        const groupReports = reports.filter((report) => report.groupId === group.id);
        const reached = Math.min(group.reporterCount, REPORT_CASE_THRESHOLD);
        return (
          <li key={group.id} className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_16rem]">
            <div className="grid content-start gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-lg">{group.title}</h3>
                <ToneBadge tone={REPORT_STATE_TONES[group.state]}>
                  {REPORT_STATE_LABELS[group.state]}
                </ToneBadge>
              </div>
              <p className="text-muted-foreground">« {group.summary} »</p>
            </div>

            <div className="grid content-start gap-3">
              <div className="grid gap-1.5">
                <p className="font-medium tabular-nums">
                  {group.reporterCount} / {REPORT_CASE_THRESHOLD} signaleurs
                </p>
                <Progress value={(reached / REPORT_CASE_THRESHOLD) * 100} aria-hidden />
              </div>
              {group.caseId ? (
                <Button asChild>
                  <Link href={`/cases/${group.caseId}`}>
                    Voir l’affaire
                    <ArrowRight aria-hidden data-icon="inline-end" />
                  </Link>
                </Button>
              ) : (
                <OpenCaseButton groupId={group.id} />
              )}
            </div>

            <Accordion type="single" collapsible className="md:col-span-2">
              <AccordionItem value="reports">
                <AccordionTrigger>
                  Voir les {groupReports.length} signalement{groupReports.length > 1 ? 's' : ''}
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="grid gap-3">
                    {groupReports.map((report) => (
                      <li key={report.id} className="grid gap-1">
                        <p className="text-base">{report.content || report.url}</p>
                        <p className="text-muted-foreground">
                          {report.reporterName ?? 'Sans compte'} ·{' '}
                          {REPORT_REASON_LABELS[report.reason]} · {formatDateTime(report.createdAt)}
                          {report.description && ` · ${report.description}`}
                        </p>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </li>
        );
      })}
    </ul>
  );
}
