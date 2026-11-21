import { z } from 'zod';
import { apiFail, apiOk, requireApiProfile } from '@/server/api';
import { getCaseFile } from '@/server/dal/cases';

// Le dossier d'une affaire : versions retrouvées, liens entre versions, pièces.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProfile();
  if ('response' in auth) return auth.response;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return apiFail('NOT_FOUND');
  const file = await getCaseFile(id);
  return file ? apiOk(file) : apiFail('NOT_FOUND');
}
