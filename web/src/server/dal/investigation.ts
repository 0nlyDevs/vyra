import 'server-only';
import { asc, cosineDistance, eq, isNotNull, isNull } from 'drizzle-orm';
import { db } from '@/server/db';
import { cases, caseVersions } from '@/server/db/schema';

// Écritures et recherches du module Enquête sur le dossier commun (tables de l'affaire).

// Affaires sans vecteur : celles des données de démo, ou créées quand l'IA était indisponible.
export function listCasesWithoutEmbedding() {
  return db
    .select({ id: cases.id, title: cases.title, claim: cases.claim })
    .from(cases)
    .where(isNull(cases.embedding));
}

export async function setCaseEmbeddings(items: { id: string; embedding: number[] }[]) {
  await db.transaction(async (tx) => {
    for (const item of items) {
      await tx.update(cases).set({ embedding: item.embedding }).where(eq(cases.id, item.id));
    }
  });
}

// L'affaire la plus proche par le sens, avec sa distance (0 = identique, 1 = sans rapport).
export async function findClosestCaseByMeaning(embedding: number[]) {
  const distance = cosineDistance(cases.embedding, embedding);
  const [closest] = await db
    .select({ id: cases.id, distance })
    .from(cases)
    .where(isNotNull(cases.embedding))
    .orderBy(distance)
    .limit(1);
  return closest ? { id: closest.id, distance: Number(closest.distance) } : null;
}

// Tous les textes connus d'une affaire (l'information et ses versions), pour la recherche par mots.
export async function listCaseTexts() {
  const [caseRows, versionRows] = await Promise.all([
    db.select({ id: cases.id, title: cases.title, claim: cases.claim }).from(cases),
    db
      .select({ caseId: caseVersions.caseId, content: caseVersions.content })
      .from(caseVersions)
      .orderBy(asc(caseVersions.position)),
  ]);
  return caseRows.map((item) => ({
    id: item.id,
    texts: [
      item.claim,
      ...versionRows.filter((version) => version.caseId === item.id).map((v) => v.content),
    ],
  }));
}

// Une nouvelle affaire et sa première version : le texte tel qu'il a été reçu.
export async function createCaseWithFirstVersion(input: {
  title: string;
  claim: string;
  embedding: number[] | null;
  sourceName: string;
  sourceUrl: string | null;
}) {
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(cases)
      .values({ title: input.title, claim: input.claim, embedding: input.embedding })
      .returning({ id: cases.id });
    if (!created) throw new Error('Insertion de l’affaire sans retour');
    await tx.insert(caseVersions).values({
      caseId: created.id,
      position: 1,
      content: input.claim,
      sourceName: input.sourceName,
      sourceUrl: input.sourceUrl,
      publishedAt: new Date(),
    });
    return created;
  });
}
