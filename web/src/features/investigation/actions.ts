'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { type ActionResult, fail, ok } from '@/lib/action-result';
import { ERRORS } from '@/lib/errors';
import { getCurrentProfile } from '@/server/session';
import { type ExploreResult, exploreLevel, exploreVersion } from './explore';
import { type HarvestResult, refreshNewsIndex } from './news-index';
import { openCaseFromClaim } from './open-case';
import { caseIdSchema, exploreSchema, openCaseSchema } from './schema';
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
  // Le bandeau de la page dit comment l'affaire a été retrouvée, et pourquoi selon l'IA.
  const query = new URLSearchParams(
    outcome.matchedBy
      ? { retrouvee: outcome.matchedBy, ...(outcome.reason ? { pourquoi: outcome.reason } : {}) }
      : { nouvelle: '1' },
  );
  redirect(`/cases/${outcome.caseId}?${query.toString()}`);
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

// Récolte des flux RSS de l'index de presse, à la demande (avant une démo, par exemple).
export async function refreshPressIndex(): Promise<ActionResult<HarvestResult>> {
  const profile = await getCurrentProfile();
  if (!profile) return fail(ERRORS.UNAUTHORIZED);
  const result = await refreshNewsIndex(true);
  if (result.ok) revalidatePath('/cases');
  return result;
}

// Explorer une source de l'arbre : chercher qui l'a reprise ensuite, et l'ajouter à l'arbre.
export async function exploreSource(
  caseId: string,
  versionId: string,
): Promise<ActionResult<ExploreResult>> {
  const profile = await getCurrentProfile();
  if (!profile) return fail(ERRORS.UNAUTHORIZED);
  const parsed = exploreSchema.safeParse({ caseId, versionId });
  if (!parsed.success) return fail(ERRORS.VALIDATION_FAILED, parsed.error);

  const result = await exploreVersion(parsed.data.caseId, parsed.data.versionId);
  if (result.ok) revalidatePath(`/cases/${parsed.data.caseId}`);
  return result;
}

// « Explorer un niveau de plus » : toutes les sources en bout de branche sont explorées.
export async function exploreNextLevel(
  caseId: string,
): Promise<ActionResult<{ explored: number; added: number }>> {
  const profile = await getCurrentProfile();
  if (!profile) return fail(ERRORS.UNAUTHORIZED);
  const parsed = caseIdSchema.safeParse(caseId);
  if (!parsed.success) return fail(ERRORS.VALIDATION_FAILED, parsed.error);

  const result = await exploreLevel(parsed.data);
  if (result.ok) revalidatePath(`/cases/${parsed.data}`);
  return result;
}
