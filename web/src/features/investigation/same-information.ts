import 'server-only';
import { z } from 'zod';
import { INFO_RELATIONS, type InfoRelation } from '@/lib/domain';
import { runPrompt } from '@/server/processing';

// Deuxième avis, celui de l'IA : deux textes proches par le sens disent-ils vraiment la même chose ?
// Les vecteurs rapprochent « 3 morts » et « aucune victime » (même sujet) ; l'IA les sépare.

const resultSchema = z.object({
  results: z.array(z.object({ relation: z.enum(INFO_RELATIONS), reason: z.string() })),
});

export type Confirmation = { relation: InfoRelation; reason: string };

// Candidats par appel : au-delà, les réponses deviennent moins sûres. Les paquets partent en même
// temps.
const BATCH = 15;

// La relation de chaque candidat avec l'information, et sa justification en une phrase, dans
// l'ordre. `null` : l'IA n'a pas répondu (réponse de secours) : on s'en tient aux vecteurs.
export async function confirmSameInformation(
  claim: string,
  candidates: string[],
): Promise<Confirmation[] | null> {
  if (candidates.length === 0) return [];
  const batches: string[][] = [];
  for (let start = 0; start < candidates.length; start += BATCH) {
    batches.push(candidates.slice(start, start + BATCH));
  }
  const answers = await Promise.all(
    batches.map(async (batch) => {
      const answer = await runPrompt(
        'same-information',
        { claim, candidates: batch },
        resultSchema,
      );
      if (!answer.ok || answer.data.source === 'fallback') return null;
      const { results } = answer.data.result;
      return results.length === batch.length ? results : null;
    }),
  );
  if (answers.some((answer) => answer === null)) return null;
  return answers.flatMap((answer) => answer ?? []);
}
