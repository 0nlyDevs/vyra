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

// Longueur de la racine gardée : « inonde » et « inondation » donnent tous deux « inond ».
const STEM_LENGTH = 5;

// Les racines des mots significatifs : sans accents, sans « s » ni « e » final (« mortes » et
// « morts » donnent « mort »), coupées à cinq lettres.
export function significantWords(text: string) {
  const stems = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length >= 4 && !STOP_WORDS.has(word))
    .map((word) => word.replace(/[es]+$/, '').slice(0, STEM_LENGTH));
  return new Set(stems);
}

// Part des mots du texte reçu qu'on retrouve dans l'affaire (0 à 1), et leur nombre.
export function wordOverlap(input: Set<string>, known: Set<string>) {
  let shared = 0;
  for (const word of input) if (known.has(word)) shared += 1;
  return { shared, ratio: input.size === 0 ? 0 : shared / input.size };
}
