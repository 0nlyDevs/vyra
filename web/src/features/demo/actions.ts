'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { type ActionResult, fail, ok } from '@/lib/action-result';
import { ERRORS } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { AFTER_SIGN_IN_PATH } from '@/lib/navigation';
import { getProfile } from '@/server/dal/profiles';
import { db } from '@/server/db';
import { resetDemoData } from '@/server/demo/seed-data';
import { endSession, startSession } from '@/server/session';

const profileIdSchema = z.string().min(1).max(40);

// Comptes de démo en un clic (page de connexion), sans mot de passe : pour la scène.
export async function signInAs(formData: FormData): Promise<void> {
  const parsed = profileIdSchema.safeParse(formData.get('profileId'));
  const profile = parsed.success ? await getProfile(parsed.data) : null;
  if (!profile) redirect('/login');
  await startSession(profile.id);
  redirect(AFTER_SIGN_IN_PATH);
}

export async function signOut(): Promise<void> {
  await endSession();
  redirect('/login');
}

// Remet les données de démo dans leur état de départ (avant de monter sur scène, ou entre deux
// répétitions). Les profils gardent les mêmes identifiants : la personne reste connectée.
export async function resetDemo(): Promise<ActionResult<null>> {
  try {
    await resetDemoData(db);
  } catch (error) {
    logger.error('démo : réinitialisation impossible', { error });
    return fail(ERRORS.INTERNAL);
  }
  revalidatePath('/', 'layout');
  return ok(null);
}
