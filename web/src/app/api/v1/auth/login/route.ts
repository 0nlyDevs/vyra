import { signInSchema } from '@/features/auth/schema';
import { apiFail, apiOk, readJson } from '@/server/api';
import { dummyPasswordHash, verifyPassword } from '@/server/auth/password';
import { newToken } from '@/server/auth/tokens';
import { createSession, findAccountByEmail } from '@/server/dal/accounts';

// Connexion de l'application mobile : e-mail et mot de passe, en échange d'un jeton de session
// (30 jours) à envoyer ensuite en `Authorization: Bearer <jeton>`. Même contrôle que le site.
const SESSION_DAYS = 30;

export async function POST(request: Request) {
  const parsed = signInSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return apiFail('VALIDATION_FAILED', parsed.error.flatten().fieldErrors);
  }
  const found = await findAccountByEmail(parsed.data.email);
  if (found && !found.account.passwordHash) return apiFail('GOOGLE_ONLY_ACCOUNT', undefined, 401);
  const valid = await verifyPassword(
    parsed.data.password,
    found?.account.passwordHash ?? (await dummyPasswordHash()),
  );
  if (!found || !valid) return apiFail('INVALID_CREDENTIALS');

  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await createSession(found.profile.id, token, expiresAt);
  const { id, name, role, headline } = found.profile;
  return apiOk({ token, expiresAt, profile: { id, name, role, headline } });
}
