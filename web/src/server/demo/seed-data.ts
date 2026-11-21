import 'server-only';
import { eq } from 'drizzle-orm';
import type { Database } from '@/server/db';
import {
  cases,
  caseVersions,
  evidence,
  hearings,
  notes,
  profiles,
  reportGroups,
  reports,
  scenarios,
  versionLinks,
} from '@/server/db/schema';

// Données de démo : ce que le jury voit au début de la démo. Elles sont recréées à l'identique par
// `make seed` et par le bouton « Réinitialiser la démo ».
// Tous les lieux, médias et organismes cités ici sont INVENTÉS : aucun nom réel.
// Chaque module ajoute ses propres données dans `resetDemoData`, dans sa section.

export const DEMO_PROFILES = [
  { id: 'rasoa', name: 'Rasoa', role: 'admin', headline: 'Vérifie les signalements' },
  { id: 'hery', name: 'Hery', role: 'member', headline: 'Lit, doute et signale' },
] as const;

const DEMO_NOTES = [
  { profileId: 'rasoa', content: 'Préparer les données de la démo avant la répétition.' },
  { profileId: 'rasoa', content: 'Vérifier que la réponse de secours s’affiche sans wifi.' },
  { profileId: 'rasoa', content: 'Répéter le pitch : 3 minutes de démo au maximum.' },
  { profileId: 'hery', content: 'Finir l’écran principal pour le projecteur.' },
];

// Identifiants fixes : les liens entre versions y renvoient, et une URL de démo reste valable
// après une réinitialisation.
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

function daysAgo(days: number, hour: number, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, minute, 0, 0);
  return date;
}

export const DEMO_CASE_IDS = { flood: id(1), water: id(2), hiring: id(3) } as const;

const DEMO_CASES: (typeof cases.$inferInsert)[] = [
  {
    id: DEMO_CASE_IDS.flood,
    title: 'La photo de l’inondation',
    claim:
      'URGENT : inondation ce matin à Ambohitsoa-Nord, 3 morts, l’école est fermée. La mairie cache la vérité. Partagez vite !',
    kind: 'real',
    status: 'open',
  },
  {
    id: DEMO_CASE_IDS.water,
    title: 'Dix jours sans eau',
    claim:
      'La Régie des eaux annonce 10 jours de coupure dans toute la ville à partir de lundi. Faites vos réserves !',
    kind: 'real',
    status: 'open',
  },
  {
    id: DEMO_CASE_IDS.hiring,
    title: 'Le recrutement à 500 postes',
    claim:
      'Recrutement officiel : 500 postes à pourvoir. Frais de dossier de 20 000 Ar à envoyer par mobile money avant demain midi.',
    kind: 'fictional',
    status: 'open',
  },
];

const DEMO_VERSIONS: (typeof caseVersions.$inferInsert)[] = [
  // La photo de l'inondation
  {
    id: id(101),
    caseId: DEMO_CASE_IDS.flood,
    position: 1,
    content:
      'Fortes pluies : la rue du marché d’Ambohitsoa-Nord sous 40 cm d’eau. Photo de notre correspondant.',
    sourceName: 'Le Courrier de la Côte (journal local)',
    publishedAt: new Date('2019-03-12T09:00:00+03:00'),
  },
  {
    id: id(102),
    caseId: DEMO_CASE_IDS.flood,
    position: 2,
    content: 'Souvenir : l’inondation de mars 2019, rue du marché. Qui s’en rappelle ?',
    sourceName: 'Mémoire des quartiers (blog)',
    publishedAt: new Date('2024-01-20T18:30:00+03:00'),
  },
  {
    id: id(103),
    caseId: DEMO_CASE_IDS.flood,
    position: 3,
    content: 'Inondation ce matin à Ambohitsoa-Nord ! Voici la photo.',
    sourceName: 'Infos Quartier 24 (page de réseau social)',
    publishedAt: daysAgo(1, 7, 10),
  },
  {
    id: id(104),
    caseId: DEMO_CASE_IDS.flood,
    position: 4,
    content:
      'URGENT : inondation ce matin à Ambohitsoa-Nord, 3 morts, l’école est fermée. Partagez !',
    sourceName: 'Message transféré',
    publishedAt: daysAgo(1, 8, 30),
  },
  {
    id: id(105),
    caseId: DEMO_CASE_IDS.flood,
    position: 5,
    content:
      'URGENT : inondation ce matin à Ambohitsoa-Nord, 3 morts, l’école est fermée. La mairie cache la vérité. Partagez vite !',
    sourceName: 'Message transféré',
    publishedAt: daysAgo(1, 9, 15),
  },
  // Dix jours sans eau
  {
    id: id(201),
    caseId: DEMO_CASE_IDS.water,
    position: 1,
    content:
      'Avis de travaux : coupure d’eau lundi de 10 h à 14 h dans les quartiers Est et du Vieux-Pont.',
    sourceName: 'Régie des eaux d’Ambohitsoa (avis officiel)',
    publishedAt: daysAgo(3, 16),
  },
  {
    id: id(202),
    caseId: DEMO_CASE_IDS.water,
    position: 2,
    content: 'Coupure d’eau lundi dans plusieurs quartiers de la ville.',
    sourceName: 'Radio des Collines (page de réseau social)',
    publishedAt: daysAgo(2, 8),
  },
  {
    id: id(203),
    caseId: DEMO_CASE_IDS.water,
    position: 3,
    content:
      'La Régie des eaux annonce 10 jours de coupure dans toute la ville à partir de lundi. Faites vos réserves !',
    sourceName: 'Message transféré',
    publishedAt: daysAgo(1, 19, 40),
  },
  // Le recrutement à 500 postes (affaire fictive, pour les exercices)
  {
    id: id(301),
    caseId: DEMO_CASE_IDS.hiring,
    position: 1,
    content:
      'Avis de concours : 12 postes d’agent administratif. Dossier gratuit, à déposer au guichet.',
    sourceName: 'Office de l’emploi d’Ambohitsoa (avis officiel)',
    publishedAt: daysAgo(6, 10),
  },
  {
    id: id(302),
    caseId: DEMO_CASE_IDS.hiring,
    position: 2,
    content:
      'Recrutement officiel : 500 postes à pourvoir. Frais de dossier de 20 000 Ar à envoyer par mobile money avant demain midi.',
    sourceName: 'Message transféré',
    publishedAt: daysAgo(1, 12),
  },
];

const DEMO_LINKS: (typeof versionLinks.$inferInsert)[] = [
  {
    caseId: DEMO_CASE_IDS.flood,
    fromVersionId: id(101),
    toVersionId: id(102),
    changeType: 'shared_unchanged',
    note: 'La photo est reprise avec sa date d’origine.',
    confidence: 'high',
  },
  {
    caseId: DEMO_CASE_IDS.flood,
    fromVersionId: id(102),
    toVersionId: id(103),
    changeType: 'passage_cut',
    note: 'La date de 2019 disparaît, « ce matin » apparaît.',
    confidence: 'medium',
  },
  {
    caseId: DEMO_CASE_IDS.flood,
    fromVersionId: id(103),
    toVersionId: id(104),
    changeType: 'figure_changed',
    note: 'Ajout de « 3 morts » et de la fermeture de l’école, sans source.',
    confidence: 'medium',
  },
  {
    caseId: DEMO_CASE_IDS.flood,
    fromVersionId: id(104),
    toVersionId: id(105),
    changeType: 'tone_hardened',
    note: 'Ajout d’une accusation : « la mairie cache la vérité ».',
    confidence: 'high',
  },
  {
    caseId: DEMO_CASE_IDS.water,
    fromVersionId: id(201),
    toVersionId: id(202),
    changeType: 'passage_cut',
    note: 'Les horaires et les deux quartiers concernés disparaissent.',
    confidence: 'high',
  },
  {
    caseId: DEMO_CASE_IDS.water,
    fromVersionId: id(202),
    toVersionId: id(203),
    changeType: 'figure_changed',
    note: '« De 10 h à 14 h » devient « 10 jours », « deux quartiers » devient « toute la ville ».',
    confidence: 'medium',
  },
  {
    caseId: DEMO_CASE_IDS.hiring,
    fromVersionId: id(301),
    toVersionId: id(302),
    changeType: 'figure_changed',
    note: '12 postes deviennent 500, et des frais de dossier apparaissent.',
    confidence: 'low',
  },
];

const DEMO_EVIDENCE: (typeof evidence.$inferInsert)[] = [
  {
    caseId: DEMO_CASE_IDS.flood,
    number: 1,
    title: 'Article d’origine avec la photo',
    content: 'La même photo, publiée le 12 mars 2019, légendée « rue du marché sous 40 cm d’eau ».',
    sourceName: 'Le Courrier de la Côte',
    publishedAt: new Date('2019-03-12T09:00:00+03:00'),
    stance: 'contradicts',
    strength: 'solid',
  },
  {
    caseId: DEMO_CASE_IDS.flood,
    number: 2,
    title: 'Relevé de pluie de la veille',
    content: '2 mm de pluie mesurés sur 24 heures à la station d’Ambohitsoa.',
    sourceName: 'Station météo d’Ambohitsoa',
    publishedAt: daysAgo(1, 6),
    stance: 'contradicts',
    strength: 'solid',
  },
  {
    caseId: DEMO_CASE_IDS.flood,
    number: 3,
    title: 'Communiqué de la mairie',
    content: 'Aucune inondation signalée. L’école du quartier est ouverte aux horaires habituels.',
    sourceName: 'Mairie d’Ambohitsoa',
    publishedAt: daysAgo(1, 10),
    stance: 'contradicts',
    strength: 'solid',
  },
  {
    caseId: DEMO_CASE_IDS.flood,
    number: 4,
    title: 'Commentaire d’un habitant',
    content: '« Il a un peu plu cette nuit, la rue était mouillée, c’est tout. »',
    sourceName: 'Commentaire sous la publication',
    publishedAt: daysAgo(1, 9, 40),
    stance: 'context',
    strength: 'weak',
  },
  {
    caseId: DEMO_CASE_IDS.water,
    number: 1,
    title: 'Avis officiel de travaux',
    content: 'Coupure lundi de 10 h à 14 h, quartiers Est et du Vieux-Pont uniquement.',
    sourceName: 'Régie des eaux d’Ambohitsoa',
    publishedAt: daysAgo(3, 16),
    stance: 'contradicts',
    strength: 'solid',
  },
  {
    caseId: DEMO_CASE_IDS.water,
    number: 2,
    title: 'Publication de la radio',
    content: 'La radio annonce une coupure lundi, sans durée ni liste de quartiers.',
    sourceName: 'Radio des Collines',
    publishedAt: daysAgo(2, 8),
    stance: 'context',
    strength: 'weak',
  },
  {
    caseId: DEMO_CASE_IDS.hiring,
    number: 1,
    title: 'Avis de concours officiel',
    content: '12 postes, dossier gratuit, dépôt au guichet. Aucun paiement demandé.',
    sourceName: 'Office de l’emploi d’Ambohitsoa',
    publishedAt: daysAgo(6, 10),
    stance: 'contradicts',
    strength: 'solid',
  },
  {
    caseId: DEMO_CASE_IDS.hiring,
    number: 2,
    title: 'Numéro du destinataire',
    content: 'Le numéro de mobile money appartient à un particulier, pas à un organisme.',
    sourceName: 'Vérification du numéro',
    publishedAt: daysAgo(1, 14),
    stance: 'contradicts',
    strength: 'weak',
  },
];

// ─── Boîte d'alertes ────────────────────────────────────────────────────────────────────────
// Démo : quatre personnes ont déjà signalé la rumeur du riz ; le cinquième signalement, fait en
// direct par Hery, ouvre une affaire.

// Publication du fil qui porte la rumeur du riz : le module Fil d'actualité crée sa publication
// avec cet identifiant, pour que le bouton « Signaler » rejoigne ce groupe.
export const DEMO_REPORTED_POST_ID = id(900);

export const DEMO_REPORT_GROUP_IDS = { rice: id(901), network: id(902), grant: id(903) } as const;

// Les autres membres de la communauté : ils ne servent qu'à signaler.
const DEMO_REPORTERS: (typeof profiles.$inferInsert)[] = [
  { id: 'fara', name: 'Fara', role: 'member', headline: 'Signale les contenus suspects' },
  { id: 'tojo', name: 'Tojo', role: 'member', headline: 'Signale les contenus suspects' },
  { id: 'lova', name: 'Lova', role: 'member', headline: 'Signale les contenus suspects' },
  { id: 'nirina', name: 'Nirina', role: 'member', headline: 'Signale les contenus suspects' },
];

const DEMO_REPORT_GROUPS: (typeof reportGroups.$inferInsert)[] = [
  {
    id: DEMO_REPORT_GROUP_IDS.rice,
    title: 'Le riz à 300 000 Ar',
    summary: 'Le sac de riz passera à 300 000 Ar dès lundi : il faut tout acheter maintenant.',
    feedPostId: DEMO_REPORTED_POST_ID,
    createdAt: daysAgo(1, 7, 30),
  },
  {
    id: DEMO_REPORT_GROUP_IDS.network,
    title: 'Le réseau mobile coupé trois jours',
    summary:
      'Le réseau mobile sera coupé pendant trois jours dans toute la région pour des travaux.',
    createdAt: daysAgo(2, 15),
  },
  {
    id: DEMO_REPORT_GROUP_IDS.grant,
    title: 'La bourse d’études à 2 000 000 Ar',
    summary:
      'Une bourse d’études de 2 000 000 Ar est offerte à tous les lycéens qui envoient leurs coordonnées.',
    createdAt: daysAgo(3, 11),
  },
];

const DEMO_REPORTS: (typeof reports.$inferInsert)[] = [
  {
    groupId: DEMO_REPORT_GROUP_IDS.rice,
    reporterId: 'fara',
    content: 'Le sac de riz passe à 300 000 Ar lundi, stockez tout de suite !',
    feedPostId: DEMO_REPORTED_POST_ID,
    reason: 'misleading',
    description: 'Aucune source, et le message pousse à acheter dans la panique.',
    createdAt: daysAgo(1, 7, 30),
  },
  {
    groupId: DEMO_REPORT_GROUP_IDS.rice,
    reporterId: 'tojo',
    content: 'Riz à 300 000 Ar le sac dès lundi, les magasins vont être vidés.',
    feedPostId: DEMO_REPORTED_POST_ID,
    reason: 'fake',
    description: 'Le prix annoncé est trois fois le prix actuel.',
    createdAt: daysAgo(1, 9, 10),
  },
  {
    groupId: DEMO_REPORT_GROUP_IDS.rice,
    reporterId: 'lova',
    content:
      'Achetez votre riz avant lundi : 300 000 Ar le sac après. Commandez au numéro ci-dessous.',
    feedPostId: DEMO_REPORTED_POST_ID,
    reason: 'scam',
    description: 'Un numéro pour commander : cela ressemble à une arnaque.',
    createdAt: daysAgo(1, 12, 45),
  },
  {
    groupId: DEMO_REPORT_GROUP_IDS.rice,
    reporterId: 'nirina',
    content: 'Le riz va tripler lundi, prévenez toute la famille.',
    reason: 'misleading',
    description: 'Reçu dans un groupe familial, sans aucune source.',
    createdAt: daysAgo(1, 18, 20),
  },
  {
    groupId: DEMO_REPORT_GROUP_IDS.network,
    reporterId: 'fara',
    content: 'Plus de réseau mobile pendant 3 jours dans toute la région, travaux prévus.',
    reason: 'fake',
    description: 'L’opérateur n’a rien annoncé.',
    createdAt: daysAgo(2, 15),
  },
  {
    groupId: DEMO_REPORT_GROUP_IDS.network,
    reporterId: 'tojo',
    content: 'Coupure du réseau mobile trois jours dans la région : faites vos appels avant.',
    reason: 'misleading',
    description: 'Message transféré plusieurs fois, sans date.',
    createdAt: daysAgo(2, 17, 30),
  },
  {
    groupId: DEMO_REPORT_GROUP_IDS.grant,
    reporterId: 'lova',
    content: 'Bourse de 2 000 000 Ar pour tous les lycéens : envoyez nom, âge et numéro.',
    reason: 'scam',
    description: 'On demande des données personnelles en échange d’argent.',
    createdAt: daysAgo(3, 11),
  },
  {
    groupId: DEMO_REPORT_GROUP_IDS.grant,
    reporterId: 'hery',
    content: 'Bourse d’études 2 000 000 Ar, il suffit d’envoyer ses coordonnées.',
    reason: 'scam',
    description: 'Vu sur une page qui n’indique aucun organisme.',
    createdAt: daysAgo(2, 9),
  },
];

// ─── Jeu vrai ou fake ───────────────────────────────────────────────────────────────────────
// Une série de cinq informations inventées. Les trois premières sont jouées avec la salle :
// une fausse, une vraie, une impossible à trancher.

const DEMO_SCENARIOS: (typeof scenarios.$inferInsert)[] = [
  {
    id: id(1001),
    position: 1,
    title: 'Le recrutement à 500 postes',
    content:
      'Recrutement officiel : 500 postes à pourvoir à la commune. Frais de dossier de 20 000 Ar à envoyer par mobile money avant demain midi.',
    sourceName: 'Page « Emploi Ambohitsoa Info »',
    caseId: DEMO_CASE_IDS.hiring,
    clues: [
      {
        kind: 'source',
        content: 'La page a été créée il y a trois jours et ne cite aucun organisme.',
        reliable: false,
      },
      {
        kind: 'date',
        content: 'Publié ce matin, avec une échéance « avant demain midi ».',
        reliable: false,
      },
      {
        kind: 'author',
        content: 'Le numéro de mobile money appartient à un particulier.',
        reliable: false,
      },
      {
        kind: 'other_media',
        content:
          'L’Office de l’emploi annonce 12 postes, avec un dossier gratuit déposé au guichet.',
        reliable: false,
      },
    ],
    answer: 'fake',
    explanation:
      'Aucun organisme, une échéance très courte et un paiement à un particulier : ce sont les signes d’une arnaque. L’Office de l’emploi annonce en réalité 12 postes, sans frais.',
    reflex: 'Chercher la source avant de croire.',
  },
  {
    id: id(1002),
    position: 2,
    title: 'Le pont du Vieux-Port fermé samedi',
    content:
      'Le pont du Vieux-Port sera fermé aux voitures samedi, de 6 h à 18 h, pour des travaux de peinture. Une déviation passe par la route de la gare.',
    sourceName: 'Mairie d’Ambohitsoa (page officielle)',
    clues: [
      {
        kind: 'source',
        content: 'La page officielle de la mairie, active depuis des années.',
        reliable: true,
      },
      {
        kind: 'date',
        content: 'Publié quatre jours avant les travaux, avec des horaires précis.',
        reliable: true,
      },
      {
        kind: 'author',
        content: 'Signé du service de la voirie, avec le numéro de téléphone de la mairie.',
        reliable: true,
      },
      {
        kind: 'other_media',
        content: 'La Radio des Collines et Le Courrier de la Côte annoncent la même fermeture.',
        reliable: true,
      },
    ],
    answer: 'true',
    explanation:
      'Une source officielle connue, des détails précis (horaires, déviation) et deux médias qui disent la même chose : l’information tient.',
    reflex: 'Reconnaître une information qui tient.',
  },
  {
    id: id(1003),
    position: 3,
    title: 'Un jeune sur deux sans emploi',
    content:
      '« Dans notre région, un jeune sur deux est sans emploi. » Partagé 3 000 fois depuis hier.',
    sourceName: 'Compte « Jeunesse en colère »',
    clues: [
      {
        kind: 'source',
        content: 'Aucune étude, aucun organisme et aucune année ne sont cités pour ce chiffre.',
        reliable: false,
      },
      {
        kind: 'date',
        content: 'Publié hier, mais on ne sait pas de quand date le chiffre.',
        reliable: false,
      },
      {
        kind: 'author',
        content: 'Un compte connu, qui publie depuis des années sur l’emploi des jeunes.',
        reliable: true,
      },
      {
        kind: 'other_media',
        content:
          'Aucun média ne reprend ce chiffre. Le dernier chiffre officiel connu date de 2019 et portait sur tout le pays.',
        reliable: false,
      },
    ],
    answer: 'cannot_tell',
    explanation:
      'Le chiffre est peut-être juste, mais rien ne permet de le vérifier : ni étude, ni année, ni autre source. Dans ce cas, la bonne réponse est de ne pas trancher.',
    reflex: 'Savoir suspendre son jugement.',
  },
  {
    id: id(1004),
    position: 4,
    title: 'La photo qui revient',
    content:
      'URGENT : la ville est sous les eaux ce matin, regardez cette photo ! Partagez avant que ce soit supprimé.',
    sourceName: 'Compte « Infos Choc 24 »',
    imagePath: '/demo/inondation-virale.jpg',
    caseId: DEMO_CASE_IDS.flood,
    clues: [
      {
        kind: 'image',
        content: 'La même photo a été publiée en mars 2019 par Le Courrier de la Côte, ailleurs.',
        reliable: false,
      },
      {
        kind: 'date',
        content: 'Publié ce matin, alors que la station météo n’a relevé que 2 mm de pluie.',
        reliable: false,
      },
      {
        kind: 'source',
        content: 'Un compte anonyme qui publie surtout des « alertes » sans lien.',
        reliable: false,
      },
      {
        kind: 'other_media',
        content:
          'Aucun média local ne parle d’inondation, et la mairie dit que l’école est ouverte.',
        reliable: false,
      },
    ],
    answer: 'fake',
    explanation:
      'La photo est vraie, mais elle date de 2019 et montre un autre lieu. Sortie de son contexte, une vraie image peut porter une fausse information.',
    reflex: 'Vérifier la date et le lieu d’une image.',
  },
  {
    id: id(1005),
    position: 5,
    title: 'Le message qui fait peur',
    content:
      'ATTENTION : NE BUVEZ PLUS L’EAU DU ROBINET ! Un ami infirmier m’a dit que 40 personnes sont à l’hôpital. Transférez à tous vos contacts MAINTENANT !',
    sourceName: 'Message transféré plusieurs fois',
    clues: [
      {
        kind: 'author',
        content: '« Un ami infirmier » : personne n’est nommé, rien ne peut être vérifié.',
        reliable: false,
      },
      {
        kind: 'source',
        content: 'Un message transféré, sans lien ni signature.',
        reliable: false,
      },
      {
        kind: 'date',
        content: 'Aucune date : le même texte circule ailleurs depuis des années.',
        reliable: false,
      },
      {
        kind: 'other_media',
        content: 'La Régie des eaux et l’hôpital ne signalent rien ; aucun média n’en parle.',
        reliable: false,
      },
    ],
    answer: 'fake',
    explanation:
      'Majuscules, urgence, « un ami m’a dit » et l’ordre de transférer à tous : le message joue sur la peur pour être partagé vite. Aucune source ne le confirme.',
    reflex: 'Repérer l’émotion et l’urgence.',
  },
];

// Vrai dès qu'une affaire existe. Une base créée avant les affaires (profils seuls) est donc
// complétée toute seule au prochain démarrage.
// ─── Tribunal (lot de Mahery) ────────────────────────────────────────────────────────────────

const WATER_HEARING: typeof hearings.$inferInsert = {
  caseId: DEMO_CASE_IDS.water,
  profileId: 'rasoa',
  status: 'concluded',
  prosecution: {
    argument:
      'L’avis officiel de la Régie des eaux annonce une coupure de 10 h à 14 h, dans deux quartiers seulement (pièce n° 1). Rien n’y parle de dix jours ni de toute la ville. Le message que vous avez reçu a transformé quatre heures en dix jours.',
    cited: [1],
  },
  defense: {
    argument:
      'Une coupure est bien prévue lundi : la radio l’a annoncée (pièce n° 2) et la Régie aussi (pièce n° 1). Mais je n’ai aucune pièce pour la durée de dix jours ni pour l’étendue à toute la ville. Je ne défends que la coupure elle-même.',
    cited: [1, 2],
  },
  pleadingsSource: 'fallback',
  vote: 'misleading',
  certainty: 'contradicted',
  findings: {
    confirmed: ['Une coupure d’eau est prévue lundi (pièces n° 1 et 2).'],
    contested: [
      'Dix jours de coupure : quatre heures seulement (pièce n° 1).',
      'Toute la ville : deux quartiers concernés (pièce n° 1).',
    ],
    missing: [],
  },
  conclusion:
    'L’information part d’un fait réel, une coupure lundi, mais sa durée et son étendue sont contredites par l’avis officiel. C’est une exagération qui pousse à faire des réserves inutiles.',
  whatToCheck: 'La source d’origine : l’avis de la Régie donnait les horaires et les quartiers.',
  verdictSource: 'fallback',
  concludedAt: daysAgo(1, 21),
};

// ─── Scan (lot de Mahery) ────────────────────────────────────────────────────────────────────

// Images des versions de l'affaire de l'inondation (fichiers dans web/public/demo/).
const DEMO_VERSION_IMAGES: [string, string][] = [
  [id(101), '/demo/inondation-2019.png'],
  [id(103), '/demo/inondation-virale.jpg'],
];

export async function hasDemoData(database: Database) {
  const [found] = await database.select({ id: cases.id }).from(cases).limit(1);
  return found !== undefined;
}

export async function resetDemoData(database: Database) {
  await database.transaction(async (tx) => {
    // Socle commun. Supprimer une affaire supprime ses versions, ses liens et ses pièces.
    await tx.delete(cases);
    await tx.delete(notes);
    await tx.delete(profiles);
    await tx.insert(profiles).values([...DEMO_PROFILES]);
    await tx.insert(notes).values(DEMO_NOTES);
    await tx.insert(cases).values(DEMO_CASES);
    await tx.insert(caseVersions).values(DEMO_VERSIONS);
    await tx.insert(versionLinks).values(DEMO_LINKS);
    await tx.insert(evidence).values(DEMO_EVIDENCE);

    // Données des modules : chacun ajoute les siennes ici.

    // Tribunal (lot de Mahery) : l'affaire de l'eau est déjà jugée, pour montrer « déjà jugé ».
    await tx
      .update(cases)
      .set({ status: 'concluded', certainty: 'contradicted', conclusion: WATER_HEARING.conclusion })
      .where(eq(cases.id, DEMO_CASE_IDS.water));
    await tx.insert(hearings).values(WATER_HEARING);

    // Scan (lot de Mahery) : la photo de l'inondation, d'origine puis devenue virale.
    for (const [versionId, imagePath] of DEMO_VERSION_IMAGES) {
      await tx.update(caseVersions).set({ imagePath }).where(eq(caseVersions.id, versionId));
    }

    // Boîte d'alertes. Les signalements partent avec leurs profils (supprimés plus haut) ; les
    // groupes sont supprimés ici, y compris ceux créés pendant une répétition.
    await tx.delete(reportGroups);
    await tx.insert(profiles).values(DEMO_REPORTERS);
    await tx.insert(reportGroups).values(DEMO_REPORT_GROUPS);
    await tx.insert(reports).values(DEMO_REPORTS);

    // Jeu vrai ou fake. Les parties jouées partent avec leurs profils (supprimés plus haut).
    await tx.delete(scenarios);
    await tx.insert(scenarios).values(DEMO_SCENARIOS);
  });
}
