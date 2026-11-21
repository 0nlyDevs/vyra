import type { DangerLevel, DangerSignKind, ToneLevel, ToneSignKind } from '@/lib/domain';

// Comment un message est écrit, lu par du code : marche sans IA et sans réseau.
// Deux lectures, à partir de listes de mots (français, malgache, anglais) :
// - le ton : capitales criées, points d'exclamation empilés, urgence, appel à partager, mots
//   chargés d'émotion, émojis d'alarme, « on vous cache la vérité ». Un ton sensationnel est une
//   raison de regarder de plus près, jamais un verdict ;
// - le danger si la rumeur continue de circuler : accusation contre une personne, panique
//   (catastrophe, épidémie, pénurie, coupure), faux ordre ou faux communiqué officiel, appel à la
//   violence.
// Chaque citation est un morceau du texte d'origine : elle s'y retrouve mot pour mot.
// Les mots malgaches sont une première liste, à faire relire par une personne qui parle malgache.

const ACRONYM_MAX = 6;
// Part des lettres dans des mots criés au-delà de laquelle tout le texte crie.
const CAPS_RATIO = 0.3;

const URGENCY = [
  'urgent',
  'urgence',
  'alerte',
  'dernière minute',
  'flash info',
  'immédiatement',
  'tout de suite',
  'avant qu’il ne soit trop tard',
  "avant qu'il ne soit trop tard",
  'avant demain',
  'maika',
  'vaovao mafana',
  'tandremo',
  'breaking',
  'breaking news',
  'act now',
];
const SHARE = [
  'partagez',
  'partager',
  'faites tourner',
  'faites passer',
  'transférez',
  'diffusez',
  'à tous vos contacts',
  'zarao',
  'zarazarao',
  'ampitao',
  'share',
  'forward',
  'pass it on',
];
const EMOTIVE = [
  'choquant',
  'scandale',
  'scandaleux',
  'honte',
  'terrifiant',
  'horrible',
  'incroyable',
  'effrayant',
  'catastrophe',
  'catastrophique',
  'hallucinant',
  'inadmissible',
  'mampatahotra',
  'mahatsiravina',
  'henatra',
  'shocking',
  'outrageous',
  'terrifying',
  'unbelievable',
];
const HIDDEN = [
  'ils ne veulent pas que vous sachiez',
  'on vous cache',
  'on nous cache',
  'cache la vérité',
  'les médias ne disent pas',
  'la vérité cachée',
  'avant que ce soit supprimé',
  'avant suppression',
  'censuré',
  'they don’t want you to know',
  "they don't want you to know",
  'before it gets deleted',
  'miafina aminareo',
];
const ALARM_EMOJI = ['⚠️', '⚠', '🚨', '‼️', '‼', '❗', '🔴', '📢', '🆘'];

// Une pénurie ou une coupure déclenche files d'attente et stocks ; un faux ordre officiel est la
// forme de faux la plus recopiée ; un appel à la violence est le plus grave.
const PANIC = [
  'épidémie',
  'peste',
  'choléra',
  'variole',
  'mpox',
  'cyclone',
  'inondation',
  'séisme',
  'tsunami',
  'pénurie',
  'rupture de stock',
  'délestage',
  'coupure de courant',
  'coupures de courant',
  'coupure',
  'enlèvement',
  'kidnapping',
  'explosion',
  'morts',
  'aretina',
  'areti-mandoza',
  'tsy misy jiro',
  'outbreak',
  'shortage',
  'blackout',
];
const ORDER = [
  'communiqué',
  'décret',
  'arrêté ministériel',
  'arrêté préfectoral',
  'arrêté municipal',
  'note de service',
  'circulaire',
  'sur ordre du',
  'ordonnance',
  'recrutement officiel',
  'fanambarana',
  'didim-pitondrana',
  'official statement',
  'decree',
];
const VIOLENCE = [
  'tuez',
  'tuer',
  'brûlez',
  'lynchez',
  'vengeance',
  'attaquez',
  'chassez',
  'à mort',
  'vonoy',
  'dorao',
  'kill them',
  'burn them',
];
const ACCUSATION = [
  'voleur',
  'voleurs',
  'escroc',
  'corrompu',
  'assassin',
  'violeur',
  'sorcier',
  'mpangalatra',
  'mpamosavy',
  'thief',
  'corrupt',
];

export type Sign<K> = { kind: K; quote: string };
export type ToneReading = { level: ToneLevel; signs: Sign<ToneSignKind>[] };
export type DangerReading = { level: DangerLevel; signs: Sign<DangerSignKind>[] };

// Minuscules sans accents, sans changer la longueur quand c'est possible (positions conservées).
function fold(text: string) {
  return text.toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '').replaceAll('’', "'");
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Chaque expression trouvée dans le texte (mots entiers, sans tenir compte des majuscules ni des
// accents), telle qu'elle y est écrite.
function find(text: string, phrases: string[]): string[] {
  const found: string[] = [];
  const folded = fold(text);
  // Le texte replié n'a la même longueur que si aucun caractère ne s'est décomposé autrement.
  const aligned = folded.length === text.length;
  for (const phrase of phrases) {
    const pattern = new RegExp(
      `(?<![\\p{L}\\p{N}])${escapeRegExp(fold(phrase))}(?![\\p{L}\\p{N}])`,
      'u',
    );
    const match = pattern.exec(aligned ? folded : fold(text));
    if (!match) continue;
    const quote = aligned ? text.slice(match.index, match.index + match[0].length) : match[0];
    if (!found.some((known) => fold(known) === fold(quote))) found.push(quote);
  }
  return found;
}

function looksLikeAcronym(word: string) {
  // JIRAMA, INSTAT : pas un mot des listes. URGENT, ALERTE : c'est crier.
  const plain = fold(word);
  return ![...URGENCY, ...SHARE, ...EMOTIVE].some((phrase) => fold(phrase) === plain);
}

// Part des lettres dans des mots écrits en capitales, et ces mots. Un mot court seul en capitales
// est pris pour un sigle ; dans une suite de capitales, c'est crier.
function shouted(text: string): { ratio: number; words: string[] } {
  const letters = [...text].filter((char) => /\p{L}/u.test(char)).length;
  const tokens = text.match(/\p{L}+/gu) ?? [];
  const caps = tokens.map((word) => word.length >= 2 && word === word.toUpperCase());
  const words = tokens.filter((word, index) => {
    if (word.length < 4 || !caps[index]) return false;
    const inRun = (index > 0 && caps[index - 1]) || (index + 1 < tokens.length && caps[index + 1]);
    return word.length > ACRONYM_MAX || inRun || !looksLikeAcronym(word);
  });
  const total = words.reduce((sum, word) => sum + word.length, 0);
  return { ratio: letters ? total / letters : 0, words };
}

export function readTone(text: string): ToneReading {
  const signs: Sign<ToneSignKind>[] = [];
  for (const quote of find(text, URGENCY)) signs.push({ kind: 'urgency', quote });
  for (const quote of find(text, SHARE)) signs.push({ kind: 'share', quote });
  for (const quote of find(text, EMOTIVE)) signs.push({ kind: 'emotive', quote });
  for (const quote of find(text, HIDDEN)) signs.push({ kind: 'hidden', quote });
  const { ratio, words } = shouted(text);
  if (ratio >= CAPS_RATIO && words.length > 0) {
    signs.push({ kind: 'caps', quote: words.reduce((a, b) => (b.length > a.length ? b : a)) });
  }
  const bangs = text.match(/[!！]{2,}|[?!]{3,}/g);
  if (bangs)
    signs.push({
      kind: 'exclamations',
      quote: bangs.reduce((a, b) => (b.length > a.length ? b : a)),
    });
  const emoji = ALARM_EMOJI.find((symbol) => text.includes(symbol));
  if (emoji) signs.push({ kind: 'emoji', quote: emoji });

  const kinds = new Set(signs.map((sign) => sign.kind));
  const level: ToneLevel =
    kinds.size >= 3 || (kinds.has('urgency') && kinds.has('share'))
      ? 'sensational'
      : kinds.size > 0
        ? 'marked'
        : 'neutral';
  return { level, signs: signs.slice(0, 10) };
}

// Élevé : appel à la violence, accusation, ou panique présentée comme un ordre officiel.
// Moyen : un seul type. Faible : aucun. Une estimation à revoir, jamais un verdict.
export function readDanger(text: string): DangerReading {
  const signs: Sign<DangerSignKind>[] = [];
  const lists: [DangerSignKind, string[]][] = [
    ['violence', VIOLENCE],
    ['accusation', ACCUSATION],
    ['panic', PANIC],
    ['fake_order', ORDER],
  ];
  for (const [kind, words] of lists) {
    for (const quote of find(text, words).slice(0, 2)) signs.push({ kind, quote });
  }
  const kinds = new Set(signs.map((sign) => sign.kind));
  const level: DangerLevel =
    kinds.has('violence') ||
    kinds.has('accusation') ||
    (kinds.has('panic') && kinds.has('fake_order'))
      ? 'high'
      : kinds.size > 0
        ? 'medium'
        : 'low';
  return { level, signs: signs.slice(0, 6) };
}
