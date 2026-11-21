import 'server-only';
import { z } from 'zod';
import { runPrompt } from '@/server/processing';

// D'autres façons de chercher l'information : faits clés, titre neutre, anglais, malgache,
// démenti. Sans IA : aucune, on cherche alors avec l'information seule.

const schema = z.object({ queries: z.array(z.string()) });

export async function searchQueries(claim: string): Promise<string[]> {
  const answer = await runPrompt('search-queries', { claim }, schema);
  if (!answer.ok || answer.data.source === 'fallback') return [];
  return answer.data.result.queries
    .map((query) => query.trim())
    .filter((query) => query.length > 3);
}
