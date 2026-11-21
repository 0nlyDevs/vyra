'use server';

import { randomBytes } from 'node:crypto';
import { redirect } from 'next/navigation';
import { type ActionResult, fail } from '@/lib/action-result';
import { ERRORS } from '@/lib/errors';
import { fileReport } from './file-report';
import { tipSchema } from './schema';

// Signaler sans compte : le signalement rejoint les autres (même regroupement, même seuil), et la
// personne reçoit un lien privé pour suivre où il en est. Pas de connexion : c'est voulu.
export async function submitTip(
  _previous: ActionResult<never> | null,
  formData: FormData,
): Promise<ActionResult<never>> {
  const parsed = tipSchema.safeParse({
    content: formData.get('content') ?? '',
    url: formData.get('url') ?? '',
    reason: formData.get('reason') ?? '',
  });
  if (!parsed.success) return fail(ERRORS.VALIDATION_FAILED, parsed.error);

  const followToken = randomBytes(16).toString('base64url');
  const outcome = await fileReport({
    reporterId: null,
    followToken,
    content: parsed.data.content,
    url: parsed.data.url || null,
    feedPostId: null,
    reason: parsed.data.reason,
    description: '',
  });
  if (!outcome) return fail(ERRORS.ALREADY_REPORTED);
  redirect(`/verifier/suivi/${followToken}?nouveau=1`);
}
