'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { type ActionResult, fail, ok } from '@/lib/action-result';
import { isVerifier } from '@/lib/domain';
import { ERRORS } from '@/lib/errors';
import {
  createInstitution,
  createNotice,
  deleteInstitution,
  deleteNotice,
  listDirectory,
} from '@/server/dal/institutions';
import { getCurrentProfile } from '@/server/session';
import { checkImpersonation, type ImpersonationReport } from './check';
import { checkSchema, institutionSchema, noticeSchema } from './schema';

// « Est-ce bien eux ? » et l'annuaire officiel. Toujours dans cet ordre : connexion → validation
// Zod → droits → action via la DAL. Tout profil vérifie un message ; seul un vérificateur tient
// l'annuaire à jour.

export async function checkMessage(input: unknown): Promise<ActionResult<ImpersonationReport>> {
  const profile = await getCurrentProfile();
  if (!profile) return fail(ERRORS.UNAUTHORIZED);
  const parsed = checkSchema.safeParse(input);
  if (!parsed.success) return fail(ERRORS.VALIDATION_FAILED, parsed.error);
  const directory = await listDirectory();
  return ok(checkImpersonation(parsed.data.message, parsed.data.sender, directory));
}

export async function addInstitution(input: unknown): Promise<ActionResult<{ id: string }>> {
  const profile = await getCurrentProfile();
  if (!profile) return fail(ERRORS.UNAUTHORIZED);
  const parsed = institutionSchema.safeParse(input);
  if (!parsed.success) return fail(ERRORS.VALIDATION_FAILED, parsed.error);
  if (!isVerifier(profile.role)) return fail(ERRORS.FORBIDDEN);
  const { name, aliases, domains, phones, pages, senders, never } = parsed.data;
  const id = await createInstitution({
    name,
    aliases,
    channels: { domains, phones, pages, senders },
    never,
  });
  if (!id) return fail(ERRORS.INTERNAL);
  revalidatePath('/scan');
  return ok({ id });
}

export async function addNotice(input: unknown): Promise<ActionResult<{ id: string }>> {
  const profile = await getCurrentProfile();
  if (!profile) return fail(ERRORS.UNAUTHORIZED);
  const parsed = noticeSchema.safeParse(input);
  if (!parsed.success) return fail(ERRORS.VALIDATION_FAILED, parsed.error);
  if (!isVerifier(profile.role)) return fail(ERRORS.FORBIDDEN);
  const id = await createNotice(parsed.data);
  if (!id) return fail(ERRORS.NOT_FOUND);
  revalidatePath('/scan');
  return ok({ id });
}

const removeSchema = z.object({ kind: z.enum(['institution', 'notice']), id: z.uuid() });

export async function removeFromDirectory(input: unknown): Promise<ActionResult<null>> {
  const profile = await getCurrentProfile();
  if (!profile) return fail(ERRORS.UNAUTHORIZED);
  const parsed = removeSchema.safeParse(input);
  if (!parsed.success) return fail(ERRORS.VALIDATION_FAILED, parsed.error);
  if (!isVerifier(profile.role)) return fail(ERRORS.FORBIDDEN);
  const removed =
    parsed.data.kind === 'institution'
      ? await deleteInstitution(parsed.data.id)
      : await deleteNotice(parsed.data.id);
  if (!removed) return fail(ERRORS.NOT_FOUND);
  revalidatePath('/scan');
  return ok(null);
}
