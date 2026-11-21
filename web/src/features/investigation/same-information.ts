import 'server-only';
import { z } from 'zod';
import { INFO_RELATIONS, type InfoRelation } from '@/lib/domain';
import { runPrompt } from '@/server/processing';

// Deuxième avis, celui de l'IA : deux textes proches par le sens disent-ils vraiment la même chose ?
// Les vecteurs rapprochent « 3 morts » et « aucune victime » (même sujet) ; l'IA les sépare.

const resultSchema = z.object({
  results: z.array(z.object({ relation: z.enum(INFO_RELATIONS), reason: z.string() })),
});

// La relation de chaque candidat avec l'information, dans l'ordre. `null` : l'IA n'a pas répondu
// (réponse de secours) : on s'en tient alors aux vecteurs, comme avant.
export async function confirmSameInformation(
  claim: string,
  candidates: string[],
): Promise<InfoRelation[] | null> {
  if (candidates.length === 0) return [];
  const answer = await runPrompt('same-information', { claim, candidates }, resultSchema);
  if (!answer.ok || answer.data.source === 'fallback') return null;
  const { results } = answer.data.result;
  return results.length === candidates.length ? results.map((item) => item.relation) : null;
}
