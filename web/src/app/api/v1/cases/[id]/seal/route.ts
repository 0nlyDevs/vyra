import { getConclusionSeal } from '@/features/seal/actions';
import { apiResult, requireApiProfile } from '@/server/api';

// Le sceau de la conclusion d'une affaire jugée : `{ code, url }` (le QR mène à `url`), ou null si
// l'affaire n'est pas conclue ou si aucune clé de sceau n'est configurée.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProfile();
  if ('response' in auth) return auth.response;
  const { id } = await params;
  return apiResult(await getConclusionSeal(id));
}
