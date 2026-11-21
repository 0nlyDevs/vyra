import { apiOk } from '@/server/api';
import { deleteSession } from '@/server/dal/accounts';
import { currentSessionToken } from '@/server/session';

// Ferme la session du jeton envoyé (sans erreur s'il n'y en a pas).
export async function POST() {
  const token = await currentSessionToken();
  if (token) await deleteSession(token);
  return apiOk({ ok: true });
}
