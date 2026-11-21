// Bonus du jeu : annoncer la vérité au groupe famille, sans vexer personne. Tout est inventé :
// la famille, ses prénoms et l'offre reprise de l'information « Le recrutement à 500 postes ».

export const FAMILY_GROUP_NAME = 'La grande famille';

export const FAMILY_MEMBERS = [
  {
    name: 'Tonton Fidy',
    personality: 'Partage tout pour rendre service ; se vexe si on le traite de naïf.',
  },
  {
    name: 'Cousine Mialy',
    personality: '22 ans, cherche du travail ; prête à payer les frais ce soir.',
  },
  {
    name: 'Tantine Voahangy',
    personality: 'Méfiante, veut savoir d’où vient l’information.',
  },
];

export const FAMILY_OPENING = [
  {
    name: 'Tonton Fidy',
    message:
      'Recrutement officiel : 500 postes à la commune ! Frais de dossier de 20 000 Ar par mobile money avant demain midi. Partagez aux jeunes de la famille !',
  },
  { name: 'Cousine Mialy', message: 'Super ! J’envoie les 20 000 Ar ce soir.' },
];

export const FAMILY_RUMOR = FAMILY_OPENING[0]?.message ?? '';

// Ce que le joueur a appris dans le jeu (indices de « Le recrutement à 500 postes »).
export const FAMILY_FACTS = [
  'L’Office de l’emploi annonce 12 postes, avec un dossier gratuit déposé au guichet.',
  'Le numéro de mobile money appartient à un particulier, pas à un organisme.',
  'La page qui a publié l’offre a été créée il y a trois jours et ne cite aucun organisme.',
];

export type FamilyFeedback = { kind: boolean; sourced: boolean; useful: boolean; tip: string };

// Sans IA : une évaluation par mots-clés, moins fine que celle de l'IA mais honnête sur le message
// réellement écrit (la réponse de secours ne connaît pas ce message).
const HURTFUL = [
  'idiot',
  'bete',
  'stupide',
  'naif',
  'nul',
  'honte',
  'n importe quoi',
  'tu crois tout',
];
const SOURCES = ['office', 'officiel', 'guichet', 'source', 'site', 'annonce', 'http'];
const ACTIONS = [
  'ne payez',
  'ne paie',
  'pas payer',
  'n envoyez',
  'n envoie',
  'pas envoyer',
  'verifi',
];

function normalize(text: string) {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[’']/g, ' ');
}

export function ruleBasedFeedback(message: string): Omit<FamilyFeedback, 'tip'> {
  const text = normalize(message);
  // Mots entiers pour les mots blessants : « nul » ne doit pas être trouvé dans « annuler ».
  const padded = ` ${text.replace(/[^a-z0-9]+/g, ' ')} `;
  return {
    kind: !HURTFUL.some((word) => padded.includes(` ${word} `)),
    sourced: SOURCES.some((word) => text.includes(word)),
    useful: ACTIONS.some((word) => text.includes(word)),
  };
}
