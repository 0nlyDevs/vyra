'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { openCaseFromClaim } from '@/features/investigation/open-case';
import { type ActionResult, fail } from '@/lib/action-result';
import { ERRORS } from '@/lib/errors';
import { getFeedPost, linkPostToCase } from '@/server/dal/feed';
import { getReportStatsByFeedPost } from '@/server/dal/reports';
import { getCurrentProfile } from '@/server/session';
import { type HarvestOutcome, refreshFeed } from './harvest';
import { REGION_COOKIE, REGION_COOKIE_MAX_AGE } from './region';
import { chooseRegionSchema, openFromPostSchema } from './schema';

// « Voir l'affaire » et « Ouvrir le tribunal » depuis une publication. Sans affaire, on passe par
// l'ouverture d'enquête du module Enquête : elle retrouve une affaire proche (déjà jugée, peut-être)
// ou en crée une. La publication garde ensuite le lien vers cette affaire.
export async function openFromPost(formData: FormData): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');
  const parsed = openFromPostSchema.safeParse({
    postId: formData.get('postId'),
    target: formData.get('target'),
  });
  if (!parsed.success) redirect('/feed');

  const post = await getFeedPost(parsed.data.postId);
  if (!post) redirect('/feed');

  let caseId = post.caseId;
  if (!caseId) {
    const [stat] = await getReportStatsByFeedPost([post.id]);
    caseId = stat?.caseId ?? null;
  }
  if (!caseId) {
    const outcome = await openCaseFromClaim({
      claim: post.title ? `${post.title}. ${post.body}` : post.body,
      sourceUrl: post.url,
      sourceName: post.author ? `${post.sourceName} · ${post.author}` : post.sourceName,
    });
    caseId = outcome.caseId;
  }
  if (caseId !== post.caseId) await linkPostToCase(post.id, caseId);

  revalidatePath('/feed');
  redirect(parsed.data.target === 'court' ? `/court/${caseId}` : `/cases/${caseId}`);
}

// Région du fil, choisie à l'entrée puis modifiable : gardée un an dans le navigateur.
export async function chooseRegion(formData: FormData): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');
  const parsed = chooseRegionSchema.safeParse({ region: formData.get('region') });
  if (!parsed.success) redirect('/feed');
  const store = await cookies();
  store.set(REGION_COOKIE, parsed.data.region, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: REGION_COOKIE_MAX_AGE,
  });
  redirect('/feed');
}

// Relit les sources. `force` : bouton « Actualiser » ; sinon seulement si la dernière récolte
// a plus de 10 minutes (appel automatique de la page).
export async function refreshFeedNow(force: boolean): Promise<ActionResult<HarvestOutcome>> {
  const profile = await getCurrentProfile();
  if (!profile) return fail(ERRORS.UNAUTHORIZED);
  return refreshFeed(force === true);
}
