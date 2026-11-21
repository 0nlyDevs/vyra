// Vérifier qu'une citation est bien écrite dans un texte, quelle que soit la façon dont l'IA a
// recopié les accents, les apostrophes ou les guillemets.

// Minuscules sans accents ni ponctuation typographique, espaces regroupées.
export function normalizeForQuote(text: string) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[’‘`´]/g, "'")
    .replace(/[«»“”"]/g, '')
    .replace(/[.,;:!?…]+$/u, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function containsQuote(haystack: string, quote: string) {
  return normalizeForQuote(haystack).includes(normalizeForQuote(quote));
}

// Les passages entre guillemets (« … », “ … ” ou " … ") d'un texte.
export function quotedPassages(text: string) {
  const passages: string[] = [];
  for (const match of text.matchAll(/«\s*([^»]+?)\s*»|“([^”]+)”|"([^"]+)"/g)) {
    const passage = (match[1] ?? match[2] ?? match[3] ?? '').trim();
    if (passage) passages.push(passage);
  }
  return passages;
}
