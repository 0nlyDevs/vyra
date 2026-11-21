import { apiOk, requireApiProfile } from '@/server/api';
import { listCases } from '@/server/dal/cases';

// Les affaires, de la plus récente à la plus ancienne.
export async function GET() {
  const auth = await requireApiProfile();
  if ('response' in auth) return auth.response;
  return apiOk({ cases: await listCases() });
}
