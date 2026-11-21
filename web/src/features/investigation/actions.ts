'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { type ActionResult, fail, ok } from '@/lib/action-result';
import { ERRORS } from '@/lib/errors';
import { getCurrentProfile } from '@/server/session';
import { openCaseFromClaim } from './open-case';
import { caseIdSchema, openCaseSchema } from './schema';
import { searchWebVersions, type WebSearchResult } from './web-versions';

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

// Recherche web d'une affaire, lancée toute seule par sa page : les articles de presse qui
// rapportent la même information deviennent des versions du graphe.
export async function searchWeb(caseId: string): Promise<ActionResult<WebSearchResult>> {
  const profile = await getCurrentProfile();
  if (!profile) return fail(ERRORS.UNAUTHORIZED);
  const parsed = caseIdSchema.safeParse(caseId);
  if (!parsed.success) return fail(ERRORS.VALIDATION_FAILED, parsed.error);

  const result = await searchWebVersions(parsed.data);
  if (result.ok && result.data.kept > 0) revalidatePath(`/cases/${parsed.data}`);
  return result.ok ? ok(result.data) : result;
}
