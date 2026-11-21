import 'server-only';
import { asc, eq, inArray, isNotNull, max } from 'drizzle-orm';
import type { AiSource, MediaKind, ScanOutcome } from '@/lib/domain';
import { db } from '@/server/db';
import {
  type AlreadySeen,
  cases,
  caseVersions,
  evidence,
  type ImageReading,
  type MediaReport,
  scans,
  type Transcript,
} from '@/server/db/schema';

// Accès aux scans d'image et de vocal.

// Les images déjà connues : celles des versions d'affaires (fichiers dans web/public).
export function listKnownImages() {
  return db
    .select({ versionId: caseVersions.id, imagePath: caseVersions.imagePath })
    .from(caseVersions)
    .where(isNotNull(caseVersions.imagePath));
}

// Parmi les versions dont l'image ressemble au fichier, la plus ancienne : sa date d'origine.
export async function findOldestVersion(matches: { versionId: string; distance: number }[]) {
  if (matches.length === 0) return null;
  const rows = await db
    .select({
      versionId: caseVersions.id,
      caseId: caseVersions.caseId,
      caseTitle: cases.title,
      sourceName: caseVersions.sourceName,
      publishedAt: caseVersions.publishedAt,
    })
    .from(caseVersions)
    .innerJoin(cases, eq(cases.id, caseVersions.caseId))
    .where(
      inArray(
        caseVersions.id,
        matches.map((match) => match.versionId),
      ),
    )
    .orderBy(asc(caseVersions.publishedAt));
  const [oldest] = rows;
  if (!oldest) return null;
  const distance = Math.min(...matches.map((match) => match.distance));
  return {
    ...oldest,
    publishedAt: oldest.publishedAt?.toISOString() ?? null,
    distance,
  } satisfies AlreadySeen;
}

export async function createScan(input: {
  profileId: string;
  kind: MediaKind;
  fileName: string;
  mimeType: string;
  sha256: string;
  report?: MediaReport | null;
  alreadySeen?: AlreadySeen | null;
  reading?: ImageReading | null;
  transcript?: Transcript | null;
  outcome?: ScanOutcome | null;
  aiSource: AiSource;
}) {
  const [scan] = await db.insert(scans).values(input).returning();
  return scan;
}

export async function getScan(id: string) {
  const [scan] = await db.select().from(scans).where(eq(scans.id, id)).limit(1);
  return scan ?? null;
}

// Verse des indices au dossier d'une affaire : chaque indice devient une pièce numérotée.
export async function addScanEvidence(
  scanId: string,
  caseId: string,
  pieces: Omit<typeof evidence.$inferInsert, 'caseId' | 'number'>[],
) {
  return db.transaction(async (tx) => {
    const [last] = await tx
      .select({ number: max(evidence.number) })
      .from(evidence)
      .where(eq(evidence.caseId, caseId));
    const first = (last?.number ?? 0) + 1;
    await tx
      .insert(evidence)
      .values(pieces.map((piece, index) => ({ ...piece, caseId, number: first + index })));
    await tx.update(scans).set({ caseId }).where(eq(scans.id, scanId));
    return pieces.length;
  });
}

// Ouvre une affaire à partir d'un vocal transcrit.
export async function createCaseFromScan(scanId: string, input: { title: string; claim: string }) {
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(cases)
      .values({ title: input.title, claim: input.claim, kind: 'real', status: 'open' })
      .returning({ id: cases.id });
    if (!created) return null;
    await tx.update(scans).set({ caseId: created.id }).where(eq(scans.id, scanId));
    return created.id;
  });
}
