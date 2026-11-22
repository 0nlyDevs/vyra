import { openCaseFromScan } from '@/features/scan/actions';
import { apiResult } from '@/server/api';

// Ouvrir une enquête à partir de ce que dit un vocal ou la bande son d'une vidéo : `{ caseId }`.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return apiResult(await openCaseFromScan(id), 201);
}
