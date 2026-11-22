// Ce que la personne demande, lu dans sa question. Pur et sans dépendance : le site (qui décide
// quoi chercher et si une action peut s'exécuter tout de suite) et le panneau (qui choisit le
// message d'attente) s'en servent.

const OUTSIDE = new RegExp(
  [
    'wikip[ée]dia',
    '\\b(?:sur|dans) (?:le )?(?:web|internet|google)\\b',
    '\\b(?:recherche|cherche)\\b',
    '\\bsources?\\b',
    "\\b(?:actualit[ée]s?|r[ée]cent|r[ée]centes?|derni[èe]res? nouvelles|aujourd[’']hui)\\b",
    '\\bcomment (?:fonctionne|marche)\\b',
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

// Les accents, apostrophes et traits d'union peuvent différer entre clavier et transcription.
function normalizeCommand(question: string) {
  return question
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[-‐‑–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(
      /^(?:(?:bonjour|salut|ok|okay|stp|svp|s'il te plait|s'il vous plait|merci de)[ ,:;!]*)+/,
      '',
    );
}

const NAVIGATE =
  '(?:ouvrir|ouvres?|ouvrez|aller|acceder|voir|afficher|affiches?|montrer|montres?|consulter|emmener|emmenes?|amener|amenes?|ramener|ramenes?|conduire|conduis|rediriger|rediriges?|naviguer|mettre|envoyer|retourner|revenir|passer)';
const COMMAND = new RegExp(
  [
    // Demandes directes, y compris les formes dites à voix haute.
    '^(?:ouvre|ouvrez|ouvrir|va|vas|allez|aller|allons|emmene|emmenez|amene|amenez|ramene|ramenez|conduis|conduisez|montre|montrez|affiche|affichez|accede|lance|lancez|retourne|retournez|reviens|revenez|rediriges?|redirigez|redirection|navigue|naviguez|envoie|envoies|envoyez|passe|passez|direction)\\b',
    // « Tu peux m'ouvrir… », « pourrais-tu me conduire… », « j'aimerais consulter… ».
    `^(?:est ce que )?(?:tu (?:peux|pourrais|veux)|vous (?:pouvez|pourriez|voulez)|(?:peux|pourrais|veux) tu|(?:pouvez|pourriez|voulez) vous|je (?:veux|voudrais|souhaite|souhaiterais|desire|aimerais)|j'aimerais|j'ai (?:envie|besoin) de)\\b.{0,45}\\b${NAVIGATE}\\b`,
    `^(?:me |nous )?${NAVIGATE}\\b`,
    '^je (?:veux|voudrais|souhaite) etre redirige(?:e)?\\b',
  ].join('|'),
);

// Une explication ou un refus ne doit pas devenir une navigation à cause d'un nom de page.
const EXPLANATION =
  /\b(?:comment|pourquoi|expliquer|explique|savoir|comprendre|fonctionne|fonctionnement|difference|signifie)\b/;
const REFUSAL =
  /\b(?:ne |n').{0,45}\b(?:pas|plus|jamais)\b|\bsans (?:me |nous )?(?:ouvrir|rediriger|aller|naviguer)\b/;

const VERIFY =
  /\b(?:est[- ]ce vrai|c[’']est vrai|vrai ou faux|fake|v[ée]rifi|confirm|[çc]a circule|rumeur)/i;
const REPORT = /\bsignal/i;
const INVESTIGATE = /\benqu[êe]te/i;
const SCAN = /\b(?:scan|image|photo|vid[ée]o|vocal|fichier)\b/i;

/** Faut-il chercher des sources extérieures (Wikipédia, vérifications publiées) ? */
export function wantsOutsideSources(question: string) {
  if (pageFromCommand(question)) return false;
  if (
    /\b(?:comment|expliquer|explique|utiliser|fonctionne)\b/i.test(question) &&
    /\b(?:plateforme|assistant|module|sceau|mot de passe|compte|enqu[êe]tes?|tribunal|scan)\b/i.test(
      question,
    ) &&
    !/\b(?:web|internet|google|wikip[ée]dia|sources?)\b/i.test(question)
  )
    return false;
  return OUTSIDE.test(question) || VERIFY.test(question);
}

/** Une action de navigation peut-elle s'exécuter tout de suite ? Seulement si c'est demandé. */
export function isCommand(question: string) {
  const command = normalizeCommand(question);
  return !EXPLANATION.test(command) && !REFUSAL.test(command) && COMMAND.test(command);
}

/** Le message d'attente, adapté à ce qui est demandé. */
export function loadingLabel(question: string) {
  if (/wikip[ée]dia/i.test(question)) return 'Je cherche sur Wikipédia…';
  if (pageFromCommand(question)) return 'Je prépare l’ouverture…';
  if (REPORT.test(question)) return 'Je prépare le signalement…';
  if (INVESTIGATE.test(question)) return 'Je prépare l’enquête…';
  if (isCommand(question)) return 'Je prépare l’ouverture…';
  if (VERIFY.test(question)) return 'Je compare les affaires jugées et les sources en ligne…';
  if (wantsOutsideSources(question))
    return 'Je cherche des sources sur le web et chez les vérificateurs…';
  if (SCAN.test(question)) return 'Je regarde comment examiner ce contenu…';
  return 'Je cherche dans le dossier…';
}

// La page demandée par une commande (« ouvre le tribunal »), ou null. Les clés sont celles de
// PAGE_TARGETS (proposals.ts) : le lien, lui, est construit côté serveur.
const PAGE_WORDS = [
  ['court', /\b(?:tribunal|audiences?)\b/],
  ['cases', /\b(?:enquetes?|investigations?|dossiers)\b/],
  ['reports', /\b(?:alertes?|signalements?)\b/],
  ['scan', /\b(?:scan|examiner|examen)\b/],
  ['game', /\b(?:jeu|vrai ou fake|jouer)\b/],
  ['flash', /\b(?:flash|radio)\b/],
  ['feed', /\b(?:fil|actualites?|publications?)\b/],
] as const;

export function pageFromCommand(question: string) {
  if (!isCommand(question)) return null;
  const command = normalizeCommand(question);
  const namedPage = /\b(?:page|module|section|ecran)\s+(?:des?\s+|d'|les?\s+|du\s+|l')?(.+)/.exec(
    command,
  );
  if (namedPage) return PAGE_WORDS.find(([, pattern]) => pattern.test(namedPage[1]))?.[0] ?? null;
  // Un dossier précis ou un formulaire pré-rempli doit passer par les propositions du serveur.
  if (
    /\b(?:affaire|dossier)\b|\b(?:une?|nouvelle|cette|mon|ma) (?:enquete|signalement)\b|\b(?:enquete|signalement) (?:sur|concernant|du|de)\b/.test(
      command,
    )
  )
    return null;
  return PAGE_WORDS.find(([, pattern]) => pattern.test(command))?.[0] ?? null;
}
