// Le contexte que lit l'assistant : les affaires les plus proches de la question d'abord (recherche
// par le sens), puis les plus récentes pour compléter, sans doublon. L'ordre fixe les numéros que
// la réponse peut citer ([1], [2]…).
export const ASSISTANT_CONTEXT_SIZE = 12;

export function pickAssistantCases<T extends { id: string }>(
  nearest: readonly T[],
  recent: readonly T[],
  size = ASSISTANT_CONTEXT_SIZE,
): T[] {
  const seen = new Set<string>();
  const picked: T[] = [];
  for (const row of [...nearest, ...recent]) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    picked.push(row);
    if (picked.length === size) break;
  }
  return picked;
}
