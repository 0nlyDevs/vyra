import 'server-only';
import { asc, desc, eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { cases, caseVersions, evidence, versionLinks } from '@/server/db/schema';

// Lecture du dossier commun. Chaque module écrit dans ses propres fichiers de DAL.

const caseColumns = {
  id: cases.id,
  title: cases.title,
  claim: cases.claim,
  kind: cases.kind,
  status: cases.status,
  certainty: cases.certainty,
  conclusion: cases.conclusion,
  createdAt: cases.createdAt,
};

export function listCases() {
  return db.select(caseColumns).from(cases).orderBy(desc(cases.createdAt), asc(cases.title));
}

// L'affaire avec ses versions (de la plus ancienne à la plus récente), ses liens et ses pièces.
export async function getCaseFile(id: string) {
  const [found] = await db.select(caseColumns).from(cases).where(eq(cases.id, id)).limit(1);
  if (!found) return null;

  const [versions, links, pieces] = await Promise.all([
    db
      .select()
      .from(caseVersions)
      .where(eq(caseVersions.caseId, id))
      .orderBy(asc(caseVersions.position)),
    db.select().from(versionLinks).where(eq(versionLinks.caseId, id)),
    db.select().from(evidence).where(eq(evidence.caseId, id)).orderBy(asc(evidence.number)),
  ]);

  return { ...found, versions, links, evidence: pieces };
}

export type CaseSummary = Awaited<ReturnType<typeof listCases>>[number];
export type CaseFile = NonNullable<Awaited<ReturnType<typeof getCaseFile>>>;
