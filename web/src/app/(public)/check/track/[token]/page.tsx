import { Check } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/common/PageHeader';
import { ToneBadge } from '@/components/common/ToneBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { followTokenSchema } from '@/features/reports/schema';
import {
  REPORT_CASE_THRESHOLD,
  REPORT_REASON_LABELS,
  REPORT_STATE_LABELS,
  REPORT_STATE_TONES,
  REPORT_STATES,
} from '@/lib/domain';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { getReportByFollowToken } from '@/server/dal/reports';

export const metadata = { title: 'Suivi du signalement' };

// Le suivi d'un signalement fait sans compte : la page n'est trouvable que par son lien privé.
export default async function TipFollowPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const [{ token }, { new: isNew }] = await Promise.all([params, searchParams]);
  if (!followTokenSchema.safeParse(token).success) notFound();
  const report = await getReportByFollowToken(token);
  if (!report) notFound();
  const reached = REPORT_STATES.indexOf(report.state);

  return (
    <>
      {isNew && (
        <div className="grid gap-1 rounded-xl bg-success-soft p-4">
          <p className="font-semibold text-success">Signalement envoyé. Merci.</p>
          <p className="text-pretty">
            Gardez cette page dans vos favoris ou copiez son adresse : c’est le seul moyen de suivre
            ce signalement sans compte.
          </p>
        </div>
      )}
      <PageHeader
        eyebrow="Suivi du signalement"
        title={report.groupTitle}
        description={`Envoyé le ${formatDate(report.createdAt)} · ${REPORT_REASON_LABELS[report.reason]}`}
        actions={
          <ToneBadge tone={REPORT_STATE_TONES[report.state]}>
            {REPORT_STATE_LABELS[report.state]}
          </ToneBadge>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Où il en est</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <ol className="grid gap-3 sm:grid-cols-4">
            {REPORT_STATES.map((state, index) => (
              <li
                key={state}
                className={cn(
                  'flex items-center gap-2 rounded-lg border p-3 text-sm',
                  index <= reached ? 'border-foreground bg-raised' : 'text-muted-foreground',
                )}
                aria-current={index === reached ? 'step' : undefined}
              >
                {index <= reached ? (
                  <Check aria-hidden className="size-4 text-primary" />
                ) : (
                  <span aria-hidden className="size-4 rounded-full border" />
                )}
                {REPORT_STATE_LABELS[state]}
              </li>
            ))}
          </ol>
          <p className="text-muted-foreground text-pretty">
            {report.reporterCount > 1
              ? `${report.reporterCount} personnes ont signalé ce contenu.`
              : 'Vous êtes la première personne à signaler ce contenu.'}{' '}
            {report.state === 'concluded'
              ? 'L’enquête est terminée : la conclusion est publique.'
              : report.state === 'verifying'
                ? 'Une enquête est en cours : les vérificateurs rassemblent les pièces.'
                : `Une enquête s’ouvre à ${REPORT_CASE_THRESHOLD} signalements, ou plus tôt si un vérificateur le décide.`}
          </p>
          {report.state === 'concluded' && report.caseId && (
            <Button asChild className="justify-self-start">
              <Link href={`/check/${report.caseId}`}>Lire la conclusion</Link>
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Ce que vous avez signalé</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {report.content && <p className="text-pretty">« {report.content} »</p>}
          {report.url && (
            <p className="break-all text-muted-foreground text-sm">
              <ToneBadge tone="neutral">Lien</ToneBadge> {report.url}
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
