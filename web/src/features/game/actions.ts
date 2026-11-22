'use server';

import { revalidatePath } from 'next/cache';
import { type ActionResult, fail, ok } from '@/lib/action-result';
import {
  CLUE_KIND_LABELS,
  CLUE_RATING_LABELS,
  GAME_ANSWER_LABELS,
  type GameGrade,
  gameGradeOf,
} from '@/lib/domain';
import { ERRORS } from '@/lib/errors';
import { getScenario, listScenarios, saveRun } from '@/server/dal/game';
import type { RunAnswer } from '@/server/db/schema';
import { demoVariantForScenario } from '@/server/demo/game-variants';
import { type AiSource, runPrompt } from '@/server/processing';
import { getCurrentProfile } from '@/server/session';
import {
  FAMILY_FACTS,
  FAMILY_MEMBERS,
  FAMILY_OPENING,
  FAMILY_RUMOR,
  type FamilyFeedback,
  ruleBasedFeedback,
} from './family';
import {
  type DebriefInput,
  debriefResultSchema,
  debriefSchema,
  familyMessageSchema,
  familyResultSchema,
  type RunInput,
  runSchema,
} from './schema';

export type RunResult = { score: number; total: number; grade: GameGrade };

// Enregistre une série terminée. Toujours dans cet ordre : connexion → validation Zod → droits →
// DAL. Tout profil peut jouer ; la justesse de chaque réponse vient de la base, pas du navigateur.
export async function finishRun(input: RunInput): Promise<ActionResult<RunResult>> {
  const profile = await getCurrentProfile();
  if (!profile) return fail(ERRORS.UNAUTHORIZED);
  const parsed = runSchema.safeParse(input);
  if (!parsed.success) return fail(ERRORS.VALIDATION_FAILED, parsed.error);

  const scenarios = new Map((await listScenarios()).map((scenario) => [scenario.id, scenario]));
  // Une série = chaque information une fois. Sinon on gonflerait son score en renvoyant vingt fois
  // la même bonne réponse.
  const answered = new Set(parsed.data.answers.map((given) => given.scenarioId));
  if (answered.size !== parsed.data.answers.length || answered.size !== scenarios.size) {
    return fail(ERRORS.VALIDATION_FAILED);
  }
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

export type Debrief = { advice: string; source: AiSource };

// Un conseil personnalisé après une réponse : l'IA s'appuie sur les indices mal notés. Sans IA,
// la réponse de secours propre à l'information s'affiche (le jeu continue de toute façon).
export async function getDebrief(input: DebriefInput): Promise<ActionResult<Debrief>> {
  const profile = await getCurrentProfile();
  if (!profile) return fail(ERRORS.UNAUTHORIZED);
  const parsed = debriefSchema.safeParse(input);
  if (!parsed.success) return fail(ERRORS.VALIDATION_FAILED, parsed.error);

  const scenario = await getScenario(parsed.data.scenarioId);
  if (!scenario) return fail(ERRORS.NOT_FOUND);
  const { answer, ratings } = parsed.data;

  const result = await runPrompt(
    'game-debrief',
    {
      information: scenario.content,
      source: scenario.sourceName,
      correctAnswer: GAME_ANSWER_LABELS[scenario.answer],
      playerAnswer: GAME_ANSWER_LABELS[answer],
      playerWasRight: answer === scenario.answer,
      explanation: scenario.explanation,
      reflex: scenario.reflex,
      clues: scenario.clues.map((clue) => {
        const rating = ratings[clue.kind];
        return {
          clue: CLUE_KIND_LABELS[clue.kind],
          content: clue.content,
          expected: CLUE_RATING_LABELS[clue.reliable ? 'reliable' : 'suspicious'].toLowerCase(),
          playerRating: rating ? CLUE_RATING_LABELS[rating].toLowerCase() : 'non noté',
        };
      }),
    },
    debriefResultSchema,
    { fallbackVariant: demoVariantForScenario(scenario.id) },
  );
  if (!result.ok) return result;
  return ok({ advice: result.data.result.advice, source: result.data.source });
}

export type FamilyReply = {
  message: string;
  replies: { name: string; message: string }[];
  feedback: FamilyFeedback;
  source: AiSource;
};

// Bonus : la famille (jouée par l'IA) réagit au message du joueur, et le coach l'évalue.
// Sans IA, les réponses préparées s'affichent et l'évaluation vient de règles simples.
export async function sendToFamily(
  _previous: ActionResult<FamilyReply> | null,
  formData: FormData,
): Promise<ActionResult<FamilyReply>> {
  const profile = await getCurrentProfile();
  if (!profile) return fail(ERRORS.UNAUTHORIZED);
  const parsed = familyMessageSchema.safeParse({ message: formData.get('message') ?? '' });
  if (!parsed.success) return fail(ERRORS.VALIDATION_FAILED, parsed.error);
  const { message } = parsed.data;

  const result = await runPrompt(
    'game-family',
    {
      rumor: FAMILY_RUMOR,
      sharedBy: FAMILY_OPENING[0]?.name,
      facts: FAMILY_FACTS,
      family: FAMILY_MEMBERS,
      message,
    },
    familyResultSchema,
  );
  if (!result.ok) return result;

  const { replies, feedback } = result.data.result;
  const source = result.data.source;
  return ok({
    message,
    replies,
    feedback: source === 'gemini' ? feedback : { ...ruleBasedFeedback(message), tip: feedback.tip },
    source,
  });
}
