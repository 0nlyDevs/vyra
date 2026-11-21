'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { type ActionResult, fail, ok } from '@/lib/action-result';
import { isVerifier, REPORT_CASE_THRESHOLD, REPORT_DAILY_LIMIT } from '@/lib/domain';
import { ERRORS } from '@/lib/errors';
import {
  addReport,
  countGroupReporters,
  countReportsSince,
  createGroup,
  fillGroupEmbedding,
  findMatchingGroup,
  hasReportedInGroup,
  openCaseForGroup,
} from '@/server/dal/reports';
import { embedTexts } from '@/server/processing';
import { getCurrentProfile } from '@/server/session';
import { reportSchema } from './schema';

const DAY_MS = 24 * 60 * 60 * 1000;
const GROUP_TITLE_MAX_LENGTH = 60;

export type ReportOutcome = {
  // Signaleurs différents du contenu, celui-ci compris.
  reporterCount: number;
  // L'affaire du contenu, dès que le seuil est atteint.
  caseId: string | null;
};

// Titre d'un nouveau groupe : la première phrase du contenu, coupée à un mot si elle est longue.
function groupTitle(text: string) {
  const sentence = text.split(/[\n.!?]/)[0]?.trim() || text.trim();
  if (sentence.length <= GROUP_TITLE_MAX_LENGTH) return sentence;
  const cut = sentence.slice(0, GROUP_TITLE_MAX_LENGTH);
  return `${cut.slice(0, cut.lastIndexOf(' ')) || cut}…`;
}

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

  // Sans IA, le regroupement passe par la publication, le lien ou les mots : la démo continue.
  const vectors = content ? await embedTexts([content]) : null;
  const embedding = vectors?.ok ? (vectors.data[0] ?? null) : null;

  let groupId = await findMatchingGroup({ feedPostId, url, content, embedding });
  if (groupId) {
    if (await hasReportedInGroup(groupId, profile.id)) return fail(ERRORS.ALREADY_REPORTED);
    if (embedding) await fillGroupEmbedding(groupId, embedding);
  } else {
    const text = content || url || '';
    const group = await createGroup({
      title: groupTitle(text),
      summary: text,
      feedPostId,
      embedding,
    });
    groupId = group.id;
  }

  await addReport({
    groupId,
    reporterId: profile.id,
    content,
    url,
    feedPostId,
    reason,
    description,
  });

  const reporterCount = await countGroupReporters(groupId);
  const caseId = reporterCount >= REPORT_CASE_THRESHOLD ? await openCaseForGroup(groupId) : null;

  revalidatePath('/reports');
  if (caseId) {
    revalidatePath('/dashboard');
    revalidatePath('/cases');
  }
  return ok({ reporterCount, caseId });
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
