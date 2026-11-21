import { Gavel } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import {
  CaseStatusBadge,
  CertaintyBadge,
  EvidenceStanceBadge,
} from '@/components/common/DomainBadges';
import { PageHeader } from '@/components/common/PageHeader';
import { ToneBadge } from '@/components/common/ToneBadge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PropagationGraph } from '@/features/investigation/PropagationGraph';
import { EVIDENCE_STRENGTH_LABELS } from '@/lib/domain';
import { formatDateTime } from '@/lib/format';
import { getCaseFile } from '@/server/dal/cases';

// Le dossier d'une affaire, en lecture seule : versions retrouvées et pièces.
// Le module Enquête remplace la liste des versions par le graphe ; le tribunal part des pièces.
export default async function CaseFilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ retrouvee?: string; nouvelle?: string }>;
}) {
  const { id } = await params;
  const { retrouvee, nouvelle } = await searchParams;
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
          <>
            {file.certainty ? (
              <CertaintyBadge level={file.certainty} />
            ) : (
              <CaseStatusBadge status={file.status} />
            )}
            <Button asChild>
              <Link href={`/court/${file.id}`}>
                <Gavel aria-hidden />
                Ouvrir le tribunal
              </Link>
            </Button>
          </>
        }
      />

      {retrouvee && (
        <Alert>
          <AlertTitle>Cette information est déjà dans un dossier</AlertTitle>
          <AlertDescription>
            Le texte analysé ressemble à une affaire connue. Voici ses versions retrouvées.
          </AlertDescription>
        </Alert>
      )}
      {nouvelle && (
        <Alert>
          <AlertTitle>Nouvelle affaire ouverte</AlertTitle>
          <AlertDescription>
            Aucune version proche n’a été retrouvée. Le texte reçu est la première version du
            dossier.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            Propagation : {file.versions.length}{' '}
            {file.versions.length > 1 ? 'versions retrouvées' : 'version retrouvée'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PropagationGraph versions={file.versions} links={file.links} />
        </CardContent>
      </Card>

      <div className="grid gap-6">
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
