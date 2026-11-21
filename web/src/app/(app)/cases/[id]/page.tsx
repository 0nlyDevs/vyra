import { notFound } from 'next/navigation';
import { z } from 'zod';
import {
  CaseStatusBadge,
  CertaintyBadge,
  EvidenceStanceBadge,
} from '@/components/common/DomainBadges';
import { PageHeader } from '@/components/common/PageHeader';
import { ToneBadge } from '@/components/common/ToneBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CHANGE_TYPE_LABELS, EVIDENCE_STRENGTH_LABELS, LINK_CONFIDENCE_LABELS } from '@/lib/domain';
import { formatDateTime } from '@/lib/format';
import { getCaseFile } from '@/server/dal/cases';

// Le dossier d'une affaire, en lecture seule : versions retrouvées et pièces.
// Le module Enquête remplace la liste des versions par le graphe ; le tribunal part des pièces.
export default async function CaseFilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const file = await getCaseFile(id);
  if (!file) notFound();

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Affaire"
        title={file.title}
        description={`« ${file.claim} »`}
        actions={
          file.certainty ? (
            <CertaintyBadge level={file.certainty} />
          ) : (
            <CaseStatusBadge status={file.status} />
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Versions retrouvées</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-4">
              {file.versions.map((version) => {
                const link = file.links.find((item) => item.toVersionId === version.id);
                return (
                  <li key={version.id} className="grid gap-1.5 border-l-2 pl-4">
                    <p className="text-muted-foreground text-sm">
                      {version.position}. {version.sourceName} ·{' '}
                      {formatDateTime(version.publishedAt)}
                    </p>
                    <p>{version.content}</p>
                    {link && (
                      <p className="flex flex-wrap items-center gap-2 text-sm">
                        <ToneBadge tone="warning">{CHANGE_TYPE_LABELS[link.changeType]}</ToneBadge>
                        <span className="text-muted-foreground">
                          {link.note} Confiance :{' '}
                          {LINK_CONFIDENCE_LABELS[link.confidence].toLowerCase()}.
                        </span>
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
            <p className="mt-4 text-muted-foreground text-sm">
              Seules les versions retrouvées sont affichées. D’autres peuvent exister.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Pièces du dossier</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-4">
              {file.evidence.map((piece) => (
                <li key={piece.id} className="grid gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      Pièce n° {piece.number} · {piece.title}
                    </span>
                    <EvidenceStanceBadge stance={piece.stance} />
                    <ToneBadge>{EVIDENCE_STRENGTH_LABELS[piece.strength]}</ToneBadge>
                  </div>
                  <p>{piece.content}</p>
                  <p className="text-muted-foreground text-sm">
                    {piece.sourceName} · {formatDateTime(piece.publishedAt)}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
