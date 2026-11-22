'use server';

import { z } from 'zod';
import { type ActionResult, fail, ok } from '@/lib/action-result';
import { ERRORS } from '@/lib/errors';
import { type Seal, sealForCase } from './check';

// Le sceau de la carte à partager. Ouvert sans compte : il ne dit que ce que la page publique
// de l'affaire jugée montre déjà, et rien n'est modifié. null : pas de sceau possible.
export async function getConclusionSeal(caseId: string): Promise<ActionResult<Seal | null>> {
  const parsed = z.uuid().safeParse(caseId);
  if (!parsed.success) return fail(ERRORS.VALIDATION_FAILED, parsed.error);
  return ok(await sealForCase(parsed.data));
}
