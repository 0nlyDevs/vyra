import { Gavel } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { AiReading } from '@/components/common/AiReading';
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
import { frontierOf } from '@/features/investigation/explore';
import { FactCheckPanel } from '@/features/investigation/FactCheckPanel';
import { PropagationGraph } from '@/features/investigation/PropagationGraph';
import { SourceKindBadge } from '@/features/investigation/SourceKindBadge';
import { WebSearchPanel } from '@/features/investigation/WebSearchPanel';
import { SealCard } from '@/features/seal/SealCard';
import { WarningSigns } from '@/features/signals/WarningSigns';
import { WhatIfPanel } from '@/features/whatif/WhatIfPanel';
import {
  CERTAINTY_CRITERIA,
  EVIDENCE_STRENGTH_LABELS,
  MATCH_KIND_LABELS,
  MATCH_KINDS,
} from '@/lib/domain';
import { formatDateTime } from '@/lib/format';
import { getCaseFile } from '@/server/dal/cases';
import { getWebSearch, listExploredVersions } from '@/server/dal/investigation';

export const metadata = { title: 'Enquête' };

// Le dossier d'une affaire, en lecture seule : versions retrouvées et pièces.
// Le module Enquête remplace la liste des versions par le graphe ; le tribunal part des pièces.
export default async function CaseFilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ matched?: string; new?: string; reason?: string }>;
}) {
  const { id } = await params;
  const { matched, new: isNew, reason } = await searchParams;
  const matchKind = z.enum(MATCH_KINDS).safeParse(matched).data;
  if (!z.uuid().safeParse(id).success) notFound();

  const file = await getCaseFile(id);
  if (!file) notFound();
  const [webSearch, explored, frontier] = await Promise.all([
    getWebSearch(id),
    listExploredVersions(id),
    frontierOf(id),
  ]);

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

      {matched && (
        <Alert>
          <AlertTitle>Cette information est déjà dans un dossier</AlertTitle>
          <AlertDescription className="grid gap-2">
            <p>Le texte analysé rejoint une affaire connue. Voici ses versions retrouvées.</p>
            {matchKind && (
              <p className="flex flex-wrap items-center gap-2">
                <ToneBadge tone={matchKind === 'ai' ? 'success' : 'neutral'}>
                  {MATCH_KIND_LABELS[matchKind]}
                </ToneBadge>
                {reason && <span className="text-foreground">« {reason} »</span>}
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}
      {isNew && (
        <Alert>
          <AlertTitle>Nouvelle affaire ouverte</AlertTitle>
          <AlertDescription>
            Aucune affaire proche dans la base : le texte reçu est la première version du dossier.
            La plateforme cherche maintenant d’autres versions dans la presse.
          </AlertDescription>
        </Alert>
      )}

      {file.certainty && (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-3 text-xl">
              Conclusion
              <CertaintyBadge level={file.certainty} />
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-muted-foreground text-sm">
              Règle appliquée, calculée sur les pièces sans IA :{' '}
              {CERTAINTY_CRITERIA[file.certainty]}
            </p>
            {file.conclusion && (
              <AiReading label="Conclusion rédigée par l’IA">
                <p className="text-pretty text-lg">{file.conclusion}</p>
              </AiReading>
            )}
          </CardContent>
        </Card>
      )}
      {file.certainty && file.conclusion && (
        <SealCard
          caseId={file.id}
          claim={file.claim}
          certainty={file.certainty}
          conclusion={file.conclusion}
        />
      )}

      <WarningSigns text={file.claim} />

      <WebSearchPanel
        caseId={file.id}
        previous={
          webSearch
            ? {
                status: webSearch.status,
                kept: webSearch.keptCount,
                contradicting: webSearch.contradictingCount,
              }
            : null
        }
        autoStart={!webSearch && file.versions.length === 1}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            Propagation : {file.versions.length - 1}{' '}
            {file.versions.length - 1 > 1 ? 'sources retrouvées' : 'source retrouvée'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PropagationGraph
            caseId={file.id}
            versions={file.versions}
            links={file.links}
            claim={file.claim}
            explored={explored}
            frontier={frontier.length}
          />
        </CardContent>
      </Card>

      <FactCheckPanel caseId={file.id} />
      <WhatIfPanel caseId={file.id} kind={file.kind} />

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
                    <SourceKindBadge source={piece} />
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
