import { signInSchema } from '@/features/auth/schema';
import { apiFail, apiOk, apiSession, readJson } from '@/server/api';
import { dummyPasswordHash, verifyPassword } from '@/server/auth/password';
import { upgradePasswordHash } from '@/server/auth/rehash';
import { findAccountByEmail } from '@/server/dal/accounts';
import { signInAllowed } from '@/server/rate-limit';

// Connexion de l'application mobile : e-mail et mot de passe, en échange d'un jeton de session
// (30 jours) à envoyer ensuite en `Authorization: Bearer <jeton>`. Même contrôle que le site.
export async function POST(request: Request) {
  const parsed = signInSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return apiFail('VALIDATION_FAILED', parsed.error.flatten().fieldErrors);
  }
  if (!(await signInAllowed(parsed.data.email))) return apiFail('RATE_LIMITED');
  const found = await findAccountByEmail(parsed.data.email);
  if (found && !found.account.passwordHash) return apiFail('GOOGLE_ONLY_ACCOUNT', undefined, 401);
  const valid = await verifyPassword(
    parsed.data.password,
    found?.account.passwordHash ?? (await dummyPasswordHash()),
  );
  if (!found || !valid) return apiFail('INVALID_CREDENTIALS');
  await upgradePasswordHash(found.profile.id, parsed.data.password, found.account.passwordHash);
  return apiOk(await apiSession(found.profile));
}
