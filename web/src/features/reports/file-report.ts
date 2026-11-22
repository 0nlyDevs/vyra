import 'server-only';
import { REPORT_CASE_THRESHOLD, type ReportReason } from '@/lib/domain';
import {
  addReport,
  countGroupReporters,
  createGroup,
  fillGroupEmbedding,
  findMatchingGroup,
  hasReportedInGroup,
  openCaseForGroup,
} from '@/server/dal/reports';
import { embedTexts } from '@/server/processing';

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

// Range un signalement (avec ou sans compte) dans le groupe du même contenu, ou en crée un, puis
// ouvre l'affaire au seuil. Renvoie null si cette personne a déjà signalé ce contenu.
// Les droits (connexion, limite par jour) sont vérifiés avant, par la server action.
export async function fileReport(input: {
  reporterId: string | null;
  followToken?: string | null;
  content: string;
  url: string | null;
  feedPostId: string | null;
  reason: ReportReason;
  description: string;
}): Promise<ReportOutcome | null> {
  const { reporterId, content, url, feedPostId } = input;
  // Sans IA, le regroupement passe par la publication, le lien ou les mots : la démo continue.
  const vectors = content ? await embedTexts([content]) : null;
  const embedding = vectors?.ok ? (vectors.data[0] ?? null) : null;

  let groupId = await findMatchingGroup({ feedPostId, url, content, embedding });
  if (groupId) {
    if (reporterId && (await hasReportedInGroup(groupId, reporterId))) return null;
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

  if (!(await addReport({ ...input, groupId }))) return null;

  const reporterCount = await countGroupReporters(groupId);
  const caseId = reporterCount >= REPORT_CASE_THRESHOLD ? await openCaseForGroup(groupId) : null;
  return { reporterCount, caseId };
}
