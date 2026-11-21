import { notFound } from 'next/navigation';
import { z } from 'zod';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/states/States';
import { Hearing } from '@/features/court/Hearing';
import { getCaseFile } from '@/server/dal/cases';
import { getLatestHearing } from '@/server/dal/court';

// L'audience d'une affaire : elle reprend là où la dernière s'est arrêtée.
export default async function HearingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [file, hearing] = await Promise.all([getCaseFile(id), getLatestHearing(id)]);
  if (!file) notFound();

  return (
    <div className="grid gap-8">
      <PageHeader eyebrow="Audience" title={file.title} />
      {file.evidence.length === 0 ? (
        <EmptyState
          title="Le dossier ne contient encore aucune pièce."
          description="Sans pièce, le tribunal ne peut rien conclure. Ajoutez des pièces depuis l’enquête ou le scan."
        />
      ) : (
        <Hearing
          caseId={file.id}
          claim={file.claim}
          pieces={file.evidence.map((piece) => ({
            id: piece.id,
            number: piece.number,
            title: piece.title,
            content: piece.content,
            sourceName: piece.sourceName,
            sourceUrl: piece.sourceUrl,
            publishedAt: piece.publishedAt,
            stance: piece.stance,
            strength: piece.strength,
          }))}
          initialHearing={
            hearing
              ? {
                  id: hearing.id,
                  status: hearing.status,
                  prosecution: hearing.prosecution,
                  defense: hearing.defense,
                  pleadingsSource: hearing.pleadingsSource,
                  vote: hearing.vote,
                  certainty: hearing.certainty,
                  findings: hearing.findings,
                  conclusion: hearing.conclusion,
                  whatToCheck: hearing.whatToCheck,
                  verdictSource: hearing.verdictSource,
                }
              : null
          }
        />
      )}
    </div>
  );
}
