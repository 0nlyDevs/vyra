import { addNotice } from '@/features/impersonation/actions';
import { apiResult, readJson } from '@/server/api';

// Ajouter un communiqué d'origine à une institution (vérificateur).
export async function POST(request: Request) {
  return apiResult(await addNotice(await readJson(request)), 201);
}
