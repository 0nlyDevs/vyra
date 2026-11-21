import { z } from 'zod';
import { CLUE_KINDS, CLUE_RATINGS, GAME_ANSWERS } from '@/lib/domain';

// Une série terminée, telle que le navigateur l'envoie : pour chaque information, la réponse et
// la note donnée à chaque indice retourné. La justesse et le score sont recalculés côté serveur.
export const runSchema = z.object({
  answers: z
    .array(
      z.object({
        scenarioId: z.uuid(),
        answer: z.enum(GAME_ANSWERS),
        ratings: z.partialRecord(z.enum(CLUE_KINDS), z.enum(CLUE_RATINGS)),
      }),
    )
    .min(1)
    .max(20),
});

export type RunInput = z.infer<typeof runSchema>;

// Demande d'un conseil personnalisé pour une information, une fois la réponse donnée.
export const debriefSchema = z.object({
  scenarioId: z.uuid(),
  answer: z.enum(GAME_ANSWERS),
  ratings: z.partialRecord(z.enum(CLUE_KINDS), z.enum(CLUE_RATINGS)),
});

export type DebriefInput = z.infer<typeof debriefSchema>;

// Forme du JSON du prompt `game-debrief` (processing/app/prompts/game-debrief.md et ses secours).
export const debriefResultSchema = z.object({ advice: z.string().min(1).max(600) });

// Le message du joueur au groupe famille (bonus du jeu).
export const familyMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(10, 'Écrivez au moins 10 caractères.')
    .max(600, '600 caractères au maximum.'),
});

// Forme du JSON du prompt `game-family` (processing/app/prompts/game-family.md et son secours).
export const familyResultSchema = z.object({
  replies: z
    .array(z.object({ name: z.string().min(1), message: z.string().min(1).max(400) }))
    .min(1)
    .max(4),
  feedback: z.object({
    kind: z.boolean(),
    sourced: z.boolean(),
    useful: z.boolean(),
    tip: z.string().min(1).max(400),
  }),
});
