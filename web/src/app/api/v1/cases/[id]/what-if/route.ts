import { generateWhatIf } from '@/features/whatif/actions';
import { apiFail, apiOk, requireApiProfile } from '@/server/api';

// What If ? : la version calme d'un contenu réel, ou les trois versions d'une affaire fictive.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProfile();
  if ('response' in auth) return auth.response;
  const { id } = await params;
  const result = await generateWhatIf(id);
  return result.ok ? apiOk(result.data) : apiFail(result.error.code, result.error.fieldErrors);
}
