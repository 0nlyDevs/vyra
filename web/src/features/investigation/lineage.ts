// L'arbre de propagation : pour chaque source, de quelle source plus ancienne elle s'est
// probablement inspirée. Trois indices, du plus sûr au moins sûr :
// 1. un lien vers l'article plus ancien ;
// 2. une citation de son média (« selon RFI ») ;
// 3. des phrases recopiées (suites de quatre mots identiques).
// Sans aucun indice, la source est rattachée à la plus ancienne : « reprise possible ».

export type LineageNode = {
  key: string;
  // Date de publication en millisecondes ; inconnue : après les sources datées.
  time: number | null;
  text: string;
  url: string | null;
  site: string;
  links: string[];
};

export type LineageBasis = 'link' | 'citation' | 'text' | 'guess';

export type LineageEdge = { parent: string; child: string; basis: LineageBasis; score: number };

const SHINGLE_WORDS = 4;
// Part minimale de suites de mots communes pour dire « phrases reprises ».
const MIN_REUSE = 0.12;
// Mots trop courants pour désigner un média dans un texte.
const GENERIC_LABELS = new Set([
  'www',
  'news',
  'info',
  'infos',
  'actu',
  'blog',
  'fr',
  'com',
  'org',
]);

function words(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

export function shingles(text: string) {
  const list = words(text);
  const set = new Set<string>();
  for (let index = 0; index + SHINGLE_WORDS <= list.length; index += 1) {
    set.add(list.slice(index, index + SHINGLE_WORDS).join(' '));
  }
  return set;
}

// Part des suites de mots du plus court des deux textes qu'on retrouve dans l'autre (0 à 1).
export function reuse(a: Set<string>, b: Set<string>) {
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  if (small.size === 0) return 0;
  let shared = 0;
  for (const shingle of small) if (large.has(shingle)) shared += 1;
  return shared / small.size;
}

function sameUrl(a: string, b: string) {
  const plain = (url: string) =>
    url
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/[?#].*$/, '')
      .replace(/\/$/, '')
      .toLowerCase();
  return plain(a) === plain(b);
}

// Le nom court d'un média, tel qu'on le cite : « rfi » pour rfi.fr, « lemonde » pour lemonde.fr.
function brand(node: LineageNode) {
  if (node.url) {
    try {
      const labels = new URL(node.url).hostname.replace(/^www\./, '').split('.');
      const label = labels.length > 1 ? labels[labels.length - 2] : labels[0];
      if (label && label.length >= 3 && !GENERIC_LABELS.has(label)) return label;
    } catch {
      // Adresse illisible : on essaie le nom de la source.
    }
  }
  const first = words(node.site)[0];
  return first && first.length >= 3 && !GENERIC_LABELS.has(first) ? first : null;
}

function cites(child: LineageNode, parent: LineageNode): LineageBasis | null {
  if (parent.url && child.links.some((link) => sameUrl(link, parent.url ?? ''))) return 'link';
  const name = brand(parent);
  if (name && words(child.text).includes(name)) return 'citation';
  return null;
}

function order(a: LineageNode, b: LineageNode) {
  return (a.time ?? Number.MAX_SAFE_INTEGER) - (b.time ?? Number.MAX_SAFE_INTEGER);
}

// Un parent par source, sauf la plus ancienne (la racine). Sans indice, une source se rattache à
// `anchor` quand il est plus ancien qu'elle (la source qu'on explore), sinon à la racine.
export function buildLineage(nodes: LineageNode[], anchor?: string): LineageEdge[] {
  const sorted = [...nodes].sort(order);
  const prints = new Map(sorted.map((node) => [node.key, shingles(node.text)]));
  const root = sorted[0];
  if (!root) return [];

  return sorted.slice(1).map((child, index): LineageEdge => {
    const childPrint = prints.get(child.key) ?? new Set<string>();
    const candidates = sorted.slice(0, index + 1).map((parent) => {
      const score = reuse(childPrint, prints.get(parent.key) ?? new Set<string>());
      const explicit = cites(child, parent);
      const basis: LineageBasis = explicit ?? (score >= MIN_REUSE ? 'text' : 'guess');
      // Un lien vaut plus qu'une citation, qui vaut plus que des phrases communes. À indice égal,
      // la source la plus proche par le texte, puis la plus récente, l'emporte.
      const rank = { link: 3, citation: 2, text: 1, guess: 0 }[basis] + score;
      return { edge: { parent: parent.key, child: child.key, basis, score }, rank };
    });
    const best = candidates.reduce((top, item) => (item.rank >= top.rank ? item : top));
    if (best.edge.basis === 'guess') {
      const earlier = sorted.slice(0, index + 1).some((node) => node.key === anchor);
      const parent = anchor && earlier ? anchor : root.key;
      return { parent, child: child.key, basis: 'guess', score: best.edge.score };
    }
    return best.edge;
  });
}

// Le texte le plus proche parmi des candidats (pour rattacher un démenti à ce qu'il dément).
export function closest(text: string, candidates: { key: string; text: string }[]) {
  const print = shingles(text);
  let best: { key: string; score: number } | null = null;
  for (const candidate of candidates) {
    const score = reuse(print, shingles(candidate.text));
    if (!best || score > best.score) best = { key: candidate.key, score };
  }
  return best?.key ?? null;
}
