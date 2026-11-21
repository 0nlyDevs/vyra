'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { type ActionResult, fail } from '@/lib/action-result';
import { ERRORS } from '@/lib/errors';
import { getCurrentProfile } from '@/server/session';
import { openCaseFromClaim } from './open-case';
import { openCaseSchema } from './schema';

// Nouvelle analyse depuis /cases : ouvre l'affaire existante ou en crée une, puis y emmène.
// Ordre : connexion → validation Zod → droits (tout profil peut lancer une analyse) → DAL.
export async function openCase(
  _previous: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  const profile = await getCurrentProfile();
  if (!profile) return fail(ERRORS.UNAUTHORIZED);
  const parsed = openCaseSchema.safeParse({
    claim: formData.get('claim'),
    sourceUrl: formData.get('sourceUrl') ?? '',
  });
  if (!parsed.success) return fail(ERRORS.VALIDATION_FAILED, parsed.error);

  const outcome = await openCaseFromClaim(parsed.data);
  revalidatePath('/cases');
  redirect(
    outcome.matchedBy
      ? `/cases/${outcome.caseId}?retrouvee=1`
      : `/cases/${outcome.caseId}?nouvelle=1`,
  );
}
