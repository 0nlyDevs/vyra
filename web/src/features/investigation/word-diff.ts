// Comparaison mot à mot de deux versions, sans IA : on garde la plus longue suite de mots communs,
// le reste est « retiré » (seulement dans l'ancienne) ou « ajouté » (seulement dans la nouvelle).

export type DiffPart = { kind: 'same' | 'removed' | 'added'; text: string };

function tokenize(text: string) {
  return text.split(/(\s+)/).filter((token) => token.length > 0);
}

// Deux mots sont égaux sans tenir compte de la casse ni de la ponctuation collée.
function comparable(token: string) {
  return token.toLowerCase().replace(/[.,;:!?«»"'’()]/g, '');
}

export function diffWords(before: string, after: string) {
  const a = tokenize(before);
  const b = tokenize(after);
  const ka = a.map(comparable);
  const kb = b.map(comparable);

  // Table de la plus longue sous-suite commune, remplie depuis la fin.
  const lengths = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      lengths[i][j] =
        ka[i] === kb[j]
          ? lengths[i + 1][j + 1] + 1
          : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
    }
  }

  const left: DiffPart[] = [];
  const right: DiffPart[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (ka[i] === kb[j]) {
      push(left, 'same', a[i]);
      push(right, 'same', b[j]);
      i += 1;
      j += 1;
    } else if (lengths[i + 1][j] >= lengths[i][j + 1]) {
      push(left, 'removed', a[i]);
      i += 1;
    } else {
      push(right, 'added', b[j]);
      j += 1;
    }
  }
  for (; i < a.length; i += 1) push(left, 'removed', a[i]);
  for (; j < b.length; j += 1) push(right, 'added', b[j]);

  return { before: left, after: right };
}

// Regroupe les morceaux voisins de même nature ; les espaces restent du côté qui les entoure.
function push(parts: DiffPart[], kind: DiffPart['kind'], token: string) {
  const last = parts.at(-1);
  const isSpace = /^\s+$/.test(token);
  if (last && (last.kind === kind || isSpace)) {
    last.text += token;
    return;
  }
  parts.push({ kind: isSpace ? 'same' : kind, text: token });
}
