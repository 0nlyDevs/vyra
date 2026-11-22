import { openCaseNow } from '@/features/reports/actions';
import { apiResult } from '@/server/api';

// Le vérificateur ouvre l'affaire d'un groupe d'alertes sans attendre le seuil : `{ caseId }`.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return apiResult(await openCaseNow(id), 201);
}
