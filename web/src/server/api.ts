import 'server-only';
import type { ActionResult } from '@/lib/action-result';
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
  FILE_TOO_LARGE: 413,
  FILE_NOT_SUPPORTED: 415,
  VIDEO_FAILED: 422,
  NOTHING_TO_ADD: 409,
  INTERNAL: 500,
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

// Le résultat d'une server action du site, rendu tel quel en JSON : les routes mobiles appellent
// les mêmes fonctions que les écrans du site (le jeton Bearer vaut le cookie).
export function apiResult<T>(result: ActionResult<T>, status = 200) {
  return result.ok
    ? apiOk(result.data, status)
    : apiFail(result.error.code, result.error.fieldErrors);
}

export async function readJson(request: Request): Promise<unknown> {
  return request.json().catch(() => null);
}
