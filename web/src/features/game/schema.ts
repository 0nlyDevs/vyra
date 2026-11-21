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
