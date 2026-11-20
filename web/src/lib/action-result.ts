import { type ZodError, z } from 'zod';
import type { AppError } from '@/lib/errors';

// Résultat de toute server action : on ne lance jamais d'exception vers le client.
// `data` n'est accessible qu'après avoir testé `result.ok`.
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: AppError };

export function ok<T>(data: T): { ok: true; data: T } {
  return { ok: true, data };
}

// Seules les erreurs de validation Zod sont transmises en détail (messages des schémas).
export function fail(error: AppError, details?: ZodError): { ok: false; error: AppError } {
  const fieldErrors = details
    ? (z.flattenError(details).fieldErrors as Record<string, string[] | undefined>)
    : undefined;
  return {
    ok: false,
    error: fieldErrors
      ? { code: error.code, message: error.message, fieldErrors }
      : { code: error.code, message: error.message },
  };
}
