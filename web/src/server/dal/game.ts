import 'server-only';
import { asc, count, desc, eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { gameRuns, type RunAnswer, scenarios } from '@/server/db/schema';

// Accès aux données du jeu vrai ou fake.

// Les informations d'une série, dans leur ordre.
export function listScenarios() {
  return db.select().from(scenarios).orderBy(asc(scenarios.position));
}

export async function getScenario(id: string) {
  const [scenario] = await db.select().from(scenarios).where(eq(scenarios.id, id)).limit(1);
  return scenario ?? null;
}

export function countScenarios() {
  return db
    .select({ total: count() })
    .from(scenarios)
    .then(([row]) => row?.total ?? 0);
}

// La meilleure série d'une personne (à score égal, la plus ancienne), et son nombre de séries.
export async function getPlayerRecord(profileId: string) {
  const [[best], [played]] = await Promise.all([
    db
      .select({ score: gameRuns.score, total: gameRuns.total, createdAt: gameRuns.createdAt })
      .from(gameRuns)
      .where(eq(gameRuns.profileId, profileId))
      .orderBy(desc(gameRuns.score), asc(gameRuns.createdAt))
      .limit(1),
    db.select({ total: count() }).from(gameRuns).where(eq(gameRuns.profileId, profileId)),
  ]);
  return { best: best ?? null, runsPlayed: played?.total ?? 0 };
}

export async function saveRun(input: {
  profileId: string;
  answers: RunAnswer[];
  score: number;
  total: number;
}) {
  const [run] = await db.insert(gameRuns).values(input).returning({ id: gameRuns.id });
  return run;
}
