import { registerAccount } from '@/features/auth/actions';
import { apiFail, apiOk, apiSession, readJson } from '@/server/api';

// Créer un compte depuis l'application mobile : `{ name, email, password }`, mêmes règles que le
// site (e-mail de confirmation envoyé). Renvoie la session comme `POST /auth/login`.
export async function POST(request: Request) {
  const body = (await readJson(request)) as Record<string, unknown> | null;
  const form = new FormData();
  for (const key of ['name', 'email', 'password']) {
    const value = body?.[key];
    if (typeof value === 'string') form.set(key, value);
  }
  const result = await registerAccount(form);
  if (!result.ok) return apiFail(result.error.code, result.error.fieldErrors);
  return apiOk(await apiSession(result.data), 201);
}
