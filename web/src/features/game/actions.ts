'use server';

import { revalidatePath } from 'next/cache';
import { type ActionResult, fail, ok } from '@/lib/action-result';
import { type GameGrade, gameGradeOf } from '@/lib/domain';
import { ERRORS } from '@/lib/errors';
import { listScenarios, saveRun } from '@/server/dal/game';
import type { RunAnswer } from '@/server/db/schema';
import { getCurrentProfile } from '@/server/session';
import { type RunInput, runSchema } from './schema';

export type RunResult = { score: number; total: number; grade: GameGrade };

// Enregistre une série terminée. Toujours dans cet ordre : connexion → validation Zod → droits →
// DAL. Tout profil peut jouer ; la justesse de chaque réponse vient de la base, pas du navigateur.
export async function finishRun(input: RunInput): Promise<ActionResult<RunResult>> {
  const profile = await getCurrentProfile();
  if (!profile) return fail(ERRORS.UNAUTHORIZED);
  const parsed = runSchema.safeParse(input);
  if (!parsed.success) return fail(ERRORS.VALIDATION_FAILED, parsed.error);

  const scenarios = new Map((await listScenarios()).map((scenario) => [scenario.id, scenario]));
  const answers: RunAnswer[] = [];
  for (const given of parsed.data.answers) {
    const scenario = scenarios.get(given.scenarioId);
    if (!scenario) return fail(ERRORS.NOT_FOUND);
    answers.push({ ...given, correct: given.answer === scenario.answer });
  }

  const score = answers.filter((answer) => answer.correct).length;
  const total = answers.length;
  await saveRun({ profileId: profile.id, answers, score, total });

  revalidatePath('/game');
  return ok({ score, total, grade: gameGradeOf(score, total) });
}
