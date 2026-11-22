import { z } from 'zod';
import { sourceKind } from '@/features/investigation/source-kind';
import { signalsOf } from '@/features/signals/quick-check';
import { apiFail, apiOk, requireApiProfile } from '@/server/api';
import { getCaseFile } from '@/server/dal/cases';

// Le dossier d'une affaire : versions retrouvées, liens entre versions, pièces. Comme la page du
// site, chaque version et chaque pièce porte le type de sa source (`sourceKind`), et le dossier les
// signes d'alerte de l'information (`signals`, relevés sans IA).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProfile();
  if ('response' in auth) return auth.response;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return apiFail('NOT_FOUND');
  const file = await getCaseFile(id);
  if (!file) return apiFail('NOT_FOUND');
  return apiOk({
    ...file,
    versions: file.versions.map((version) => ({
      ...version,
      sourceKind: sourceKind(version.sourceUrl, version.sourceName),
    })),
    evidence: file.evidence.map((piece) => ({
      ...piece,
      sourceKind: sourceKind(piece.sourceUrl, piece.sourceName),
    })),
    signals: signalsOf(file.claim),
  });
}
