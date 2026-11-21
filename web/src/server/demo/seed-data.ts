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
  });
}
