import { addScanToCase } from '@/features/scan/actions';
import { apiResult, readJson } from '@/server/api';

// Verser les indices d'un scan au dossier d'une affaire : `{ caseId }`.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await readJson(request);
  const caseId = body && typeof body === 'object' && 'caseId' in body ? body.caseId : '';
  return apiResult(await addScanToCase(id, String(caseId ?? '')));
}
