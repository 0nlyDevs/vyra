import 'server-only';
import { and, asc, cosineDistance, desc, eq, isNotNull, isNull, ne, sql } from 'drizzle-orm';
import type { AiSource, CertaintyLevel, Vote } from '@/lib/domain';
import { db } from '@/server/db';
import { cases, type HearingFindings, hearings, type Pleading } from '@/server/db/schema';

// Accès aux audiences du tribunal, et à la recherche « déjà jugé ».

export async function getLatestHearing(caseId: string) {
  const [hearing] = await db
    .select()
    .from(hearings)
    .where(eq(hearings.caseId, caseId))
    .orderBy(desc(hearings.createdAt))
    .limit(1);
  return hearing ?? null;
}

export async function getHearing(id: string) {
  const [hearing] = await db.select().from(hearings).where(eq(hearings.id, id)).limit(1);
  return hearing ?? null;
}

export async function createHearing(input: {
  caseId: string;
  profileId: string;
  prosecution: Pleading;
  defense: Pleading;
  pleadingsSource: AiSource;
}) {
  return db.transaction(async (tx) => {
    // Verrou sur l'affaire : deux ouvertures simultanées donnent une seule audience.
    await tx.select({ id: cases.id }).from(cases).where(eq(cases.id, input.caseId)).for('update');
    const [existing] = await tx
      .select()
      .from(hearings)
      .where(eq(hearings.caseId, input.caseId))
      .orderBy(desc(hearings.createdAt))
      .limit(1);
    if (existing) return existing;
    const [hearing] = await tx.insert(hearings).values(input).returning();
    await tx.update(cases).set({ status: 'in_hearing' }).where(eq(cases.id, input.caseId));
    return hearing;
  });
}

// Enregistre le vote et la conclusion, puis marque l'affaire comme conclue. `embedding` sert à
// reconnaître plus tard une information proche (« déjà jugé ») ; vide si l'IA est indisponible.
export async function concludeHearing(input: {
  hearingId: string;
  caseId: string;
  vote: Vote;
  certainty: CertaintyLevel;
  findings: HearingFindings;
  conclusion: string;
  whatToCheck: string;
  verdictSource: AiSource;
  embedding: number[] | null;
}) {
  return db.transaction(async (tx) => {
    const [hearing] = await tx
      .update(hearings)
      .set({
        status: 'concluded',
        vote: input.vote,
        certainty: input.certainty,
        findings: input.findings,
        conclusion: input.conclusion,
        whatToCheck: input.whatToCheck,
        verdictSource: input.verdictSource,
        concludedAt: new Date(),
      })
      // Deux jurés au même moment : seul le premier vote conclut, le second reçoit ce verdict.
      .where(and(eq(hearings.id, input.hearingId), ne(hearings.status, 'concluded')))
      .returning();
    if (!hearing) {
      const [current] = await tx.select().from(hearings).where(eq(hearings.id, input.hearingId));
      return current;
    }
    await tx
      .update(cases)
      .set({
        status: 'concluded',
        certainty: input.certainty,
        conclusion: input.conclusion,
        ...(input.embedding ? { embedding: input.embedding } : {}),
      })
      .where(eq(cases.id, input.caseId));
    return hearing;
  });
}

const judgedColumns = {
  id: cases.id,
  title: cases.title,
  claim: cases.claim,
  certainty: cases.certainty,
  conclusion: cases.conclusion,
};

// Au-delà, deux textes ne parlent plus de la même chose (distance cosinus, 0 = identiques).
// Seuil à ajuster après essai avec le modèle de vecteurs réellement utilisé.
const MAX_MEANING_DISTANCE = 0.25;

// Mots ignorés par la recherche de secours, sans IA.
const STOP_WORDS = new Set(
  'alors aussi avec avant cette dans depuis elle elles entre être leur leurs mais même nous pour sans sont tous tout toute toutes très vous partagez urgent'.split(
    ' ',
  ),
);

function significantWords(text: string) {
  return new Set(
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length >= 4 && !STOP_WORDS.has(word)),
  );
}

// L'affaire conclue la plus proche de `text`, ou null. Par le sens si on a un vecteur, sinon (ou
// si rien n'est trouvé) par les mots en commun.
export async function findJudgedCase(text: string, embedding: number[] | null) {
  if (embedding) {
    const distance = sql<number>`${cosineDistance(cases.embedding, embedding)}`;
    const [closest] = await db
      .select({ ...judgedColumns, distance })
      .from(cases)
      .where(and(eq(cases.status, 'concluded'), isNotNull(cases.embedding)))
      .orderBy(asc(distance))
      .limit(1);
    if (closest && closest.distance <= MAX_MEANING_DISTANCE) {
      return { ...closest, mode: 'meaning' as const };
    }
  }

  const query = significantWords(text);
  if (query.size === 0) return null;
  const concluded = await db.select(judgedColumns).from(cases).where(eq(cases.status, 'concluded'));
  let best: ((typeof concluded)[number] & { score: number }) | null = null;
  for (const item of concluded) {
    const words = significantWords(`${item.title} ${item.claim}`);
    const common = [...query].filter((word) => words.has(word)).length;
    const score = common / query.size;
    if (common >= 2 && score >= 0.4 && (!best || score > best.score)) best = { ...item, score };
  }
  return best ? { ...best, mode: 'words' as const } : null;
}

// Les affaires conclues, les plus récentes d'abord : la partie publique, sans compte.
export function listConcludedCases() {
  return db
    .select({ ...judgedColumns, kind: cases.kind, createdAt: cases.createdAt })
    .from(cases)
    .where(eq(cases.status, 'concluded'))
    .orderBy(desc(cases.createdAt));
}

// Une affaire conclue et sa dernière audience, ou null si elle n'est pas conclue.
export async function getConcludedCase(id: string) {
  const [found] = await db
    .select(judgedColumns)
    .from(cases)
    .where(and(eq(cases.id, id), eq(cases.status, 'concluded')))
    .limit(1);
  if (!found) return null;
  return { ...found, hearing: await getLatestHearing(id) };
}

// Affaires réelles encore à l'enquête ou à l'audience (pour le flash radio).
export async function listOpenRealCases() {
  return db
    .select({ id: cases.id, title: cases.title })
    .from(cases)
    .where(and(eq(cases.kind, 'real'), ne(cases.status, 'concluded')))
    .orderBy(desc(cases.createdAt));
}

// Les affaires que l'assistant peut citer : les plus récentes, conclues ou non.
// Les affaires qui n'ont pas encore de vecteur (affaires de démo, ou IA coupée à la conclusion).
export function listCasesWithoutEmbedding(limit = 12) {
  return db
    .select({ id: cases.id, claim: cases.claim })
    .from(cases)
    .where(isNull(cases.embedding))
    .limit(limit);
}

export async function setCaseEmbeddings(rows: { id: string; embedding: number[] }[]) {
  for (const row of rows) {
    await db.update(cases).set({ embedding: row.embedding }).where(eq(cases.id, row.id));
  }
}

// Les affaires les plus proches de la question par le sens (pgvector) : ce que l'assistant lit
// d'abord. Vide si aucune affaire n'a de vecteur.
export function listNearestCasesForAssistant(embedding: number[], limit = 6) {
  const distance = sql<number>`${cosineDistance(cases.embedding, embedding)}`;
  return db
    .select({ ...judgedColumns, status: cases.status })
    .from(cases)
    .where(isNotNull(cases.embedding))
    .orderBy(asc(distance))
    .limit(limit);
}

export function listCasesForAssistant(limit = 12) {
  return db
    .select({ ...judgedColumns, status: cases.status })
    .from(cases)
    .orderBy(desc(cases.createdAt))
    .limit(limit);
}
