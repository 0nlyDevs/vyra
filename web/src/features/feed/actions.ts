'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { openCaseFromClaim } from '@/features/investigation/open-case';
import { getFeedPost, linkPostToCase } from '@/server/dal/feed';
import { getReportStatsByFeedPost } from '@/server/dal/reports';
import { getCurrentProfile } from '@/server/session';
import { openFromPostSchema } from './schema';

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
      claim: post.body,
      sourceUrl: post.sourceUrl,
      sourceName: post.sourceName,
    });
    caseId = outcome.caseId;
  }
  if (caseId !== post.caseId) await linkPostToCase(post.id, caseId);

  revalidatePath('/feed');
  redirect(parsed.data.target === 'court' ? `/court/${caseId}` : `/cases/${caseId}`);
}
