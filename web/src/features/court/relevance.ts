import { z } from 'zod';

export const courtRelevanceSchema = z.object({
  results: z
    .array(
      z.object({
        number: z.number().int().positive(),
        relevant: z.boolean(),
        reason: z.string().trim().min(1).max(400),
      }),
    )
    .max(16),
});

// Une décision pour chaque candidat fourni, sans numéro inventé ni décision manquante.
// Un classement incomplet ne doit pas laisser passer les voisins vectoriels non vérifiés.
export function keepRelevantCourtCases<T>(raw: unknown, candidates: readonly T[]) {
  const parsed = courtRelevanceSchema.safeParse(raw);
  if (!parsed.success || parsed.data.results.length !== candidates.length) return null;
  const decisions = new Map<number, { relevant: boolean; reason: string }>();
  for (const result of parsed.data.results) {
    if (result.number > candidates.length || decisions.has(result.number)) return null;
    decisions.set(result.number, result);
  }
  return candidates
    .flatMap((item, index) => {
      const decision = decisions.get(index + 1);
      return decision?.relevant ? [{ item, reason: decision.reason }] : [];
    })
    .slice(0, 8);
}
