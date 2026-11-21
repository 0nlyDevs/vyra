// Recherche par mots, sans IA : sert de secours quand les vecteurs ne sont pas disponibles.
// On compare les mots significatifs du texte reçu à ceux de chaque affaire connue.

const STOP_WORDS = new Set([
  'avec',
  'cette',
  'dans',
  'elle',
  'elles',
  'leur',
  'leurs',
  'mais',
  'nous',
  'pour',
  'sans',
  'sont',
  'tout',
  'toute',
  'tous',
  'très',
  'vous',
  'voici',
]);

export function significantWords(text: string) {
  const words = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length >= 4 && !STOP_WORDS.has(word));
  return new Set(words);
}

// Part des mots du texte reçu qu'on retrouve dans l'affaire (0 à 1).
export function wordOverlap(input: Set<string>, known: Set<string>) {
  if (input.size === 0) return 0;
  let shared = 0;
  for (const word of input) if (known.has(word)) shared += 1;
  return shared / input.size;
}
