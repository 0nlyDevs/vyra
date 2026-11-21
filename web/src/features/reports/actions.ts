'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { type ActionResult, fail, ok } from '@/lib/action-result';
import { isVerifier, REPORT_DAILY_LIMIT } from '@/lib/domain';
import { ERRORS } from '@/lib/errors';
import { countReportsSince, openCaseForGroup } from '@/server/dal/reports';
import { getCurrentProfile } from '@/server/session';
import { fileReport, type ReportOutcome } from './file-report';
import { reportSchema } from './schema';

const DAY_MS = 24 * 60 * 60 * 1000;

// Signaler un contenu. Toujours dans cet ordre : connexion → validation Zod → droits → DAL.
export async function submitReport(
  _previous: ActionResult<ReportOutcome> | null,
  formData: FormData,
): Promise<ActionResult<ReportOutcome>> {
  const profile = await getCurrentProfile();
  if (!profile) return fail(ERRORS.UNAUTHORIZED);
  const parsed = reportSchema.safeParse({
    content: formData.get('content') ?? '',
    url: formData.get('url') ?? '',
    feedPostId: formData.get('feedPostId') ?? '',
    reason: formData.get('reason') ?? '',
    description: formData.get('description') ?? '',
  });
  if (!parsed.success) return fail(ERRORS.VALIDATION_FAILED, parsed.error);
  const { content, reason, description } = parsed.data;
  const url = parsed.data.url || null;
  const feedPostId = parsed.data.feedPostId || null;

  // Droits : une limite par jour, puis une seule fois par contenu (vérifié une fois le groupe connu).
  const since = new Date(Date.now() - DAY_MS);
  if ((await countReportsSince(profile.id, since)) >= REPORT_DAILY_LIMIT) {
    return fail(ERRORS.REPORT_LIMIT_REACHED);
  }

  const outcome = await fileReport({
    reporterId: profile.id,
    content,
    url,
    feedPostId,
    reason,
    description,
  });
  if (!outcome) return fail(ERRORS.ALREADY_REPORTED);
  const { caseId } = outcome;

  revalidatePath('/reports');
  if (caseId) {
    revalidatePath('/dashboard');
    revalidatePath('/cases');
  }
  return ok(outcome);
}

// Le vérificateur ouvre l'affaire d'un groupe sans attendre le seuil.
export async function openCaseNow(groupId: string): Promise<ActionResult<{ caseId: string }>> {
  const profile = await getCurrentProfile();
  if (!profile) return fail(ERRORS.UNAUTHORIZED);
  const parsed = z.uuid().safeParse(groupId);
  if (!parsed.success) return fail(ERRORS.VALIDATION_FAILED);
  if (!isVerifier(profile.role)) return fail(ERRORS.FORBIDDEN);

  const caseId = await openCaseForGroup(parsed.data);
  if (!caseId) return fail(ERRORS.NOT_FOUND);

  revalidatePath('/reports');
  revalidatePath('/dashboard');
  revalidatePath('/cases');
  return ok({ caseId });
}
