import { CircleCheck, CircleDashed, CircleX } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { z } from 'zod';
import { AiNotice } from '@/components/common/AiNotice';
import { CertaintyBadge, EvidenceStanceBadge } from '@/components/common/DomainBadges';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShareCard } from '@/features/court/ShareCard';
import { CERTAINTY_CRITERIA } from '@/lib/domain';
import { formatDate } from '@/lib/format';
import { getCaseFile } from '@/server/dal/cases';
import { getConcludedCase } from '@/server/dal/court';

function Findings({ title, icon, items }: { title: string; icon: ReactNode; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="grid content-start gap-2 surface p-4">
      <p className="flex items-center gap-2 font-semibold">
        {icon}
        {title}
      </p>
      <ul className="grid gap-1.5 text-sm">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

// Une affaire jugée, lisible sans compte : la conclusion, ce qui est confirmé ou contesté, et les
// pièces sur lesquelles elle repose. On peut la renvoyer là où la rumeur circule.
export default async function PublicVerdictPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const judged = await getConcludedCase(id);
  if (!judged?.certainty) notFound();
  const file = await getCaseFile(id);
  const findings = judged.hearing?.findings;

  return (
    <>
      <PageHeader
        eyebrow="Affaire jugée"
        title={judged.title}
        description={`« ${judged.claim} »`}
        actions={<CertaintyBadge level={judged.certainty} />}
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Conclusion</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="text-muted-foreground text-sm">
            Règle appliquée : {CERTAINTY_CRITERIA[judged.certainty]}
          </p>
          {judged.conclusion && <p className="text-pretty text-lg">{judged.conclusion}</p>}
        </CardContent>
      </Card>

      {findings && (
        <div className="grid gap-4 md:grid-cols-3">
          <Findings
            title="Confirmé"
            icon={<CircleCheck aria-hidden className="size-5 text-success" />}
            items={findings.confirmed}
          />
          <Findings
            title="Contesté"
            icon={<CircleX aria-hidden className="size-5 text-danger" />}
            items={findings.contested}
          />
          <Findings
            title="Manquant"
            icon={<CircleDashed aria-hidden className="size-5 text-muted-foreground" />}
            items={findings.missing}
          />
        </div>
      )}

      {file && file.evidence.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Les pièces</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3">
              {file.evidence.map((piece) => (
                <li key={piece.id} className="grid gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      Pièce n° {piece.number} · {piece.title}
                    </span>
                    <EvidenceStanceBadge stance={piece.stance} />
                  </span>
                  <span className="text-sm">{piece.content}</span>
                  <span className="text-muted-foreground text-xs">
                    {piece.sourceUrl ? (
                      <a
                        href={piece.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline-offset-4 hover:underline"
                      >
                        {piece.sourceName}
                      </a>
                    ) : (
                      piece.sourceName
                    )}
                    {piece.publishedAt && ` · ${formatDate(piece.publishedAt)}`}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {judged.conclusion && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Partager la conclusion</CardTitle>
          </CardHeader>
          <CardContent>
            <ShareCard
              claim={judged.claim}
              certainty={judged.certainty}
              conclusion={judged.conclusion}
            />
          </CardContent>
        </Card>
      )}

      <AiNotice />
      <Link href="/verifier" className="text-primary underline-offset-4 hover:underline">
        ← Toutes les affaires jugées
      </Link>
    </>
  );
}
