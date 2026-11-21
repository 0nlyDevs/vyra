import 'server-only';
import { and, cosineDistance, count, desc, eq, gte, inArray, isNotNull, max } from 'drizzle-orm';
import type { CaseStatus, ReportReason, ReportState } from '@/lib/domain';
import { db } from '@/server/db';
import { cases, reportGroups, reports } from '@/server/db/schema';

// Accès aux signalements et à leurs groupes (Boîte d'alertes). Les règles (seuil, limite par jour,
// une fois par groupe) sont appliquées par les server actions de features/reports.

// Au-dessous de cette distance (cosinus), deux textes parlent du même contenu.
const MAX_MEANING_DISTANCE = 0.2;
// Sans IA : part de mots communs à partir de laquelle deux textes parlent du même contenu.
const MIN_SHARED_WORDS = 0.5;

// L'état d'un signalement, ou de son groupe, d'après ses signaleurs et l'affaire ouverte pour lui.
export function reportStateOf(reporterCount: number, caseStatus: CaseStatus | null): ReportState {
  if (caseStatus === 'concluded') return 'concluded';
  if (caseStatus) return 'verifying';
  return reporterCount > 1 ? 'grouped' : 'received';
}

// Nombre de signaleurs par groupe (une ligne par personne et par groupe : voir le schéma).
function reporterCounts() {
  return db
    .select({
      groupId: reports.groupId,
      reporterCount: count().as('reporter_count'),
      lastReportAt: max(reports.createdAt).as('last_report_at'),
    })
    .from(reports)
    .groupBy(reports.groupId)
    .as('reporter_counts');
}

// ─── Regroupement ───────────────────────────────────────────────────────────────────────────

// Le groupe du contenu signalé, dans cet ordre : même publication du fil, même lien, même sens
// (IA), puis mêmes mots. La publication du fil passe en premier : elle marche aussi sans wifi.
export async function findMatchingGroup(input: {
  feedPostId: string | null;
  url: string | null;
  content: string;
  embedding: number[] | null;
}) {
  if (input.feedPostId) {
    const [byPost] = await db
      .select({ id: reportGroups.id })
      .from(reportGroups)
      .where(eq(reportGroups.feedPostId, input.feedPostId))
      .limit(1);
    if (byPost) return byPost.id;
  }
  if (input.url) {
    const [byUrl] = await db
      .select({ id: reports.groupId })
      .from(reports)
      .where(eq(reports.url, input.url))
      .limit(1);
    if (byUrl) return byUrl.id;
  }
  if (input.embedding) {
    const distance = cosineDistance(reportGroups.embedding, input.embedding);
    const [byMeaning] = await db
      .select({ id: reportGroups.id, distance })
      .from(reportGroups)
      .where(isNotNull(reportGroups.embedding))
      .orderBy(distance)
      .limit(1);
    if (byMeaning && Number(byMeaning.distance) <= MAX_MEANING_DISTANCE) return byMeaning.id;
  }
  return findGroupByWords(input.content);
}

const STOP_WORDS = new Set([
  'avec',
  'cette',
  'comme',
  'dans',
  'elle',
  'elles',
  'leur',
  'leurs',
  'mais',
  'nous',
  'partagez',
  'plus',
  'pour',
  'sont',
  'tous',
  'tout',
  'toute',
  'toutes',
  'vite',
  'vous',
]);

// Les mots qui portent le sens : sans accents, au moins 4 lettres, ou un nombre.
function significantWords(text: string) {
  const words = text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => (word.length >= 4 || /^\d{2,}$/.test(word)) && !STOP_WORDS.has(word));
  return new Set(words);
}

function sharedWordRatio(a: Set<string>, b: Set<string>) {
  const smaller = Math.min(a.size, b.size);
  if (smaller === 0) return 0;
  let shared = 0;
  for (const word of a) if (b.has(word)) shared += 1;
  return shared / smaller;
}

async function findGroupByWords(content: string) {
  const words = significantWords(content);
  if (words.size === 0) return null;

  const [summaries, contents] = await Promise.all([
    db.select({ groupId: reportGroups.id, text: reportGroups.summary }).from(reportGroups),
    db
      .select({ groupId: reports.groupId, text: reports.content })
      .from(reports)
      .orderBy(desc(reports.createdAt))
      .limit(500),
  ]);

  let best: { groupId: string; ratio: number } | null = null;
  for (const candidate of [...summaries, ...contents]) {
    const ratio = sharedWordRatio(words, significantWords(candidate.text));
    if (ratio >= MIN_SHARED_WORDS && (!best || ratio > best.ratio)) {
      best = { groupId: candidate.groupId, ratio };
    }
  }
  return best?.groupId ?? null;
}

// ─── Écriture ───────────────────────────────────────────────────────────────────────────────

export async function createGroup(input: {
  title: string;
  summary: string;
  feedPostId: string | null;
  embedding: number[] | null;
}) {
  const [group] = await db.insert(reportGroups).values(input).returning({ id: reportGroups.id });
  return group;
}

export async function addReport(input: {
  groupId: string;
  reporterId: string;
  content: string;
  url: string | null;
  feedPostId: string | null;
  reason: ReportReason;
  description: string;
}) {
  const [report] = await db.insert(reports).values(input).returning({ id: reports.id });
  return report;
}

// Ouvre l'affaire du groupe (titre et texte repris du groupe), une seule fois même si deux
// signalements arrivent en même temps. Renvoie l'identifiant de l'affaire.
export async function openCaseForGroup(groupId: string) {
  return db.transaction(async (tx) => {
    const [group] = await tx
      .select()
      .from(reportGroups)
      .where(eq(reportGroups.id, groupId))
      .limit(1)
      .for('update');
    if (!group) return null;
    if (group.caseId) return group.caseId;

    const [opened] = await tx
      .insert(cases)
      .values({
        title: group.title,
        claim: group.summary,
        kind: 'real',
        status: 'investigating',
        embedding: group.embedding,
      })
      .returning({ id: cases.id });
    await tx.update(reportGroups).set({ caseId: opened.id }).where(eq(reportGroups.id, groupId));
    return opened.id;
  });
}

// ─── Lecture ────────────────────────────────────────────────────────────────────────────────

export async function hasReportedInGroup(groupId: string, reporterId: string) {
  const [found] = await db
    .select({ id: reports.id })
    .from(reports)
    .where(and(eq(reports.groupId, groupId), eq(reports.reporterId, reporterId)))
    .limit(1);
  return found !== undefined;
}

export async function countReportsSince(reporterId: string, since: Date) {
  const [row] = await db
    .select({ total: count() })
    .from(reports)
    .where(and(eq(reports.reporterId, reporterId), gte(reports.createdAt, since)));
  return row?.total ?? 0;
}

export async function countGroupReporters(groupId: string) {
  const [row] = await db
    .select({ total: count() })
    .from(reports)
    .where(eq(reports.groupId, groupId));
  return row?.total ?? 0;
}

// « Mes signalements » : les plus récents d'abord, avec l'état de chacun.
export async function listReportsByReporter(reporterId: string) {
  const counts = reporterCounts();
  const rows = await db
    .select({
      id: reports.id,
      content: reports.content,
      url: reports.url,
      reason: reports.reason,
      createdAt: reports.createdAt,
      groupTitle: reportGroups.title,
      caseId: reportGroups.caseId,
      caseStatus: cases.status,
      reporterCount: counts.reporterCount,
    })
    .from(reports)
    .innerJoin(reportGroups, eq(reportGroups.id, reports.groupId))
    .innerJoin(counts, eq(counts.groupId, reports.groupId))
    .leftJoin(cases, eq(cases.id, reportGroups.caseId))
    .where(eq(reports.reporterId, reporterId))
    .orderBy(desc(reports.createdAt));
  return rows.map((row) => {
    const reporterCount = Number(row.reporterCount);
    return { ...row, reporterCount, state: reportStateOf(reporterCount, row.caseStatus) };
  });
}

// Vue du vérificateur : les groupes, du plus signalé au moins signalé.
export async function listGroupsByReporterCount() {
  const counts = reporterCounts();
  const rows = await db
    .select({
      id: reportGroups.id,
      title: reportGroups.title,
      summary: reportGroups.summary,
      feedPostId: reportGroups.feedPostId,
      caseId: reportGroups.caseId,
      caseStatus: cases.status,
      reporterCount: counts.reporterCount,
    })
    .from(reportGroups)
    .innerJoin(counts, eq(counts.groupId, reportGroups.id))
    .leftJoin(cases, eq(cases.id, reportGroups.caseId))
    .orderBy(desc(counts.reporterCount), desc(counts.lastReportAt));
  return rows.map((row) => {
    const reporterCount = Number(row.reporterCount);
    return { ...row, reporterCount, state: reportStateOf(reporterCount, row.caseStatus) };
  });
}

// Pour le fil d'actualité : les signalements de chaque publication (badge « signalé »).
export async function getReportStatsByFeedPost(feedPostIds: string[]) {
  if (feedPostIds.length === 0) return [];
  const counts = reporterCounts();
  const rows = await db
    .select({
      feedPostId: reportGroups.feedPostId,
      caseId: reportGroups.caseId,
      caseStatus: cases.status,
      reporterCount: counts.reporterCount,
    })
    .from(reportGroups)
    .innerJoin(counts, eq(counts.groupId, reportGroups.id))
    .leftJoin(cases, eq(cases.id, reportGroups.caseId))
    .where(inArray(reportGroups.feedPostId, feedPostIds));
  return rows.map((row) => {
    const reporterCount = Number(row.reporterCount);
    return { ...row, reporterCount, state: reportStateOf(reporterCount, row.caseStatus) };
  });
}

export type ReportListItem = Awaited<ReturnType<typeof listReportsByReporter>>[number];
export type ReportGroupListItem = Awaited<ReturnType<typeof listGroupsByReporterCount>>[number];
