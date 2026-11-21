import 'server-only';
import { ERRORS, type ErrorCode } from '@/lib/errors';
import { getCurrentProfile } from '@/server/session';

// Outils communs des routes `/api/v1` (application mobile). Réponses en JSON ; une erreur a toujours
// la forme `{ error: { code, message } }`, avec un code du catalogue `lib/errors.ts`.

const STATUS: Partial<Record<ErrorCode, number>> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_FAILED: 400,
  INVALID_CREDENTIALS: 401,
  AI_UNAVAILABLE: 503,
};

export function apiOk<T>(data: T, status = 200) {
  return Response.json(data, { status });
}

export function apiFail(
  code: ErrorCode,
  fieldErrors?: Record<string, string[] | undefined>,
  status?: number,
) {
  const error = ERRORS[code];
  return Response.json(
    { error: { code, message: error.message, ...(fieldErrors ? { fieldErrors } : {}) } },
    { status: status ?? STATUS[code] ?? 400 },
  );
}

// Le profil derrière le jeton `Bearer`, ou la réponse 401 à renvoyer telle quelle.
export async function requireApiProfile() {
  const profile = await getCurrentProfile();
  return profile ? { profile } : { response: apiFail('UNAUTHORIZED') };
}

export async function readJson(request: Request): Promise<unknown> {
  return request.json().catch(() => null);
}
