'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { type ActionResult, fail, ok } from '@/lib/action-result';
import { isVerifier } from '@/lib/domain';
import { demoMode, demoResetAllowed } from '@/lib/env';
import { ERRORS } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { AFTER_SIGN_IN_PATH } from '@/lib/navigation';
import { db } from '@/server/db';
import { DEMO_PROFILES, resetDemoData } from '@/server/demo/seed-data';
import { endSession, getCurrentProfile, startSession } from '@/server/session';

const profileIdSchema = z.enum(DEMO_PROFILES.map((profile) => profile.id));

// Comptes de démo en un clic (page de connexion), sans mot de passe : pour la scène. Seulement
// les comptes de démo, et seulement en mode démo : sinon n'importe qui entrerait chez n'importe qui.
export async function signInAs(formData: FormData): Promise<void> {
  const parsed = profileIdSchema.safeParse(formData.get('profileId'));
  if (!demoMode || !parsed.success) redirect('/login');
  await startSession(parsed.data);
  redirect(AFTER_SIGN_IN_PATH);
}

export async function signOut(): Promise<void> {
  await endSession();
  redirect('/login');
}

// Remet les données de démo dans leur état de départ (avant de monter sur scène, ou entre deux
// répétitions). Les profils gardent les mêmes identifiants : la personne reste connectée.
// Efface aussi les comptes créés entre-temps : réservé à un admin, en mode démo, et jamais en
// production (voir `demoResetAllowed`).
export async function resetDemo(): Promise<ActionResult<null>> {
  const profile = await getCurrentProfile();
  if (!profile) return fail(ERRORS.UNAUTHORIZED);
  if (!demoResetAllowed || !isVerifier(profile.role)) return fail(ERRORS.FORBIDDEN);
  try {
    await resetDemoData(db);
  } catch (error) {
    logger.error('démo : réinitialisation impossible', { error });
    return fail(ERRORS.INTERNAL);
  }
  revalidatePath('/', 'layout');
  return ok(null);
}
