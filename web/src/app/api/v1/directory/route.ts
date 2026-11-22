import { isVerifier } from '@/lib/domain';
import { apiOk, requireApiProfile } from '@/server/api';
import { listDirectory } from '@/server/dal/institutions';

// L'annuaire officiel : `{ entries, canEdit }`. Lisible par tous ; `canEdit` dit si la personne
// connectée peut le tenir à jour (vérificateur).
export async function GET() {
  const auth = await requireApiProfile();
  if ('response' in auth) return auth.response;
  return apiOk({ entries: await listDirectory(), canEdit: isVerifier(auth.profile.role) });
}
