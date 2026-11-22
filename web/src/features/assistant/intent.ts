// Ce que la personne demande, lu dans sa question. Pur et sans dépendance : le site (qui décide
// quoi chercher et si une action peut s'exécuter tout de suite) et le panneau (qui choisit le
// message d'attente) s'en servent.

const OUTSIDE = new RegExp(
  [
    'wikip[ée]dia',
    '\\b(?:sur|dans) (?:le )?(?:web|internet|google)\\b',
    '\\b(?:recherche|cherche)\\b',
    '\\bqui (?:est|était|sont|étaient)\\b',
    "\\bqu[’']est[- ]ce (?:que|qu[’'])",
    "\\bc[’']est quoi\\b",
    '\\bd[ée]finition\\b',
    '\\bexplique\\b',
    "\\bd[’']où (?:vient|vient-on|provient)\\b",
    "\\b(?:origine|histoire) (?:de|du|des|d[’'])",
    '\\bque sais[- ]tu (?:sur|de|des|du)\\b',
    "\\bparle[- ]moi (?:de|du|des|d[’'])",
  ].join('|'),
  'i',
);

// Une demande d'aller quelque part ou d'ouvrir quelque chose, pas une question.
const COMMAND = new RegExp(
  [
    "^\\s*(?:s[’']il (?:te|vous) pla[iî]t[, ]+)?(?:ouvre|ouvrez|ouvrir|va|vas|allez|aller|emm[èe]ne|emmenez|montre|montrez|affiche|affichez|acc[èe]de|lance|lancez|retourne)\\b",
    '\\b(?:peux|pouvez|veux|voudrais|voulez)[- ](?:tu|vous|je)\\b.{0,25}\\b(?:ouvrir|emmener|aller|afficher|montrer)\\b',
    '\\bje (?:veux|voudrais) (?:aller|voir|ouvrir|acc[ée]der)\\b',
  ].join('|'),
  'i',
);

const VERIFY =
  /\b(?:est[- ]ce vrai|c[’']est vrai|vrai ou faux|fake|v[ée]rifi|confirm|[çc]a circule|rumeur)/i;
const REPORT = /\bsignal/i;
const INVESTIGATE = /\benqu[êe]te/i;
const SCAN = /\b(?:scan|image|photo|vid[ée]o|vocal|fichier)\b/i;

/** Faut-il chercher des sources extérieures (Wikipédia, vérifications publiées) ? */
export function wantsOutsideSources(question: string) {
  return OUTSIDE.test(question);
}

/** Une action de navigation peut-elle s'exécuter tout de suite ? Seulement si c'est demandé. */
export function isCommand(question: string) {
  return COMMAND.test(question);
}

/** Le message d'attente, adapté à ce qui est demandé. */
export function loadingLabel(question: string) {
  if (/wikip[ée]dia/i.test(question)) return 'Je cherche sur Wikipédia…';
  if (REPORT.test(question)) return 'Je prépare le signalement…';
  if (INVESTIGATE.test(question)) return 'Je prépare l’enquête…';
  if (isCommand(question)) return 'Je prépare l’ouverture…';
  if (OUTSIDE.test(question)) return 'Je cherche sur Wikipédia et chez les vérificateurs…';
  if (VERIFY.test(question)) return 'Je compare avec les affaires jugées…';
  if (SCAN.test(question)) return 'Je regarde comment examiner ce contenu…';
  return 'Je cherche dans le dossier…';
}

// La page demandée par une commande (« ouvre le tribunal »), ou null. Les clés sont celles de
// PAGE_TARGETS (proposals.ts) : le lien, lui, est construit côté serveur.
const PAGE_WORDS = [
  ['court', /\b(?:tribunal|audiences?)\b/i],
  ['cases', /\benqu[êe]tes?\b/i],
  ['reports', /\b(?:alertes?|signalements?)\b/i],
  ['scan', /\b(?:scan|examiner|examen)\b/i],
  ['game', /\b(?:jeu|vrai ou fake|jouer)\b/i],
  ['flash', /\b(?:flash|radio)\b/i],
  ['feed', /\b(?:fil|actualit[ée]s?|publications?)\b/i],
] as const;

export function pageFromCommand(question: string) {
  if (!isCommand(question)) return null;
  // Une affaire précise ou un formulaire pré-rempli doit passer par les propositions du serveur.
  if (/\b(?:affaire|dossier|enqu[êe]te|signalement)\b/i.test(question)) return null;
  return PAGE_WORDS.find(([, pattern]) => pattern.test(question))?.[0] ?? null;
}
