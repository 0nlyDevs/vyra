import { requestPasswordReset } from '@/features/auth/actions';
import { apiResult, readJson } from '@/server/api';

// Mot de passe oublié : `{ email }`. Le lien de réinitialisation part par e-mail et s'ouvre sur le
// site. Même réponse que l'adresse existe ou non : `{ sent: true }`.
export async function POST(request: Request) {
  const body = (await readJson(request)) as Record<string, unknown> | null;
  const form = new FormData();
  if (typeof body?.email === 'string') form.set('email', body.email);
  return apiResult(await requestPasswordReset(null, form));
}
