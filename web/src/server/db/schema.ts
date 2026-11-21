import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
  vector,
} from 'drizzle-orm/pg-core';
// Chemin relatif (et non `@/lib/…`) : drizzle-kit lit ce fichier sans les alias de tsconfig.
import {
  AI_SOURCES,
  AUTH_TOKEN_PURPOSES,
  CASE_KINDS,
  CASE_STATUSES,
  CERTAINTY_LEVELS,
  CHANGE_TYPES,
  type ClueKind,
  type ClueRating,
  EVIDENCE_STANCES,
  EVIDENCE_STRENGTHS,
  GAME_ANSWERS,
  type GameAnswer,
  HEARING_STATUSES,
  LINK_CONFIDENCES,
  MEDIA_KINDS,
  PROFILE_ROLES,
  REPORT_REASONS,
  SCAN_OUTCOMES,
  VOTES,
  WEB_SEARCH_STATUSES,
} from '../../lib/domain';

// Taille des vecteurs : doit rester égale à EMBEDDING_DIMENSIONS côté processing (768).
export const EMBEDDING_DIMENSIONS = 768;

// Profils de démo : on se « connecte » en choisissant l'un d'eux (pas de mot de passe).
export const profiles = pgTable('profiles', {
  id: varchar('id', { length: 40 }).primaryKey(),
  name: text('name').notNull(),
  role: text('role', { enum: PROFILE_ROLES }).notNull(),
  headline: text('headline').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Exemple de fonctionnalité (features/notes) : à copier pour la vraie, puis à supprimer.
export const notes = pgTable(
  'notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    profileId: varchar('profile_id', { length: 40 })
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    // Vide quand l'IA était indisponible : la note reste trouvable par mots.
    embedding: vector('embedding', { dimensions: EMBEDDING_DIMENSIONS }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('notes_profile_idx').on(table.profileId),
    index('notes_embedding_idx').using('hnsw', table.embedding.op('vector_cosine_ops')),
  ],
);

// ─── Comptes et sessions ─────────────────────────────────────────────────────────────────────
// Un compte donne un moyen de se connecter à un profil : e-mail et mot de passe, ou Google.
// Les autres modules ne lisent que `profiles`, avec getCurrentProfile() (src/server/session.ts).

export const accounts = pgTable(
  'accounts',
  {
    profileId: varchar('profile_id', { length: 40 })
      .primaryKey()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    // Toujours en minuscules.
    email: text('email').notNull(),
    // Vide pour un compte créé avec Google.
    passwordHash: text('password_hash'),
    googleSub: text('google_sub'),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('accounts_email_idx').on(table.email),
    uniqueIndex('accounts_google_idx').on(table.googleSub),
  ],
);

// Une session ouverte. Le cookie garde un jeton tiré au hasard ; la base n'en garde que l'empreinte.
export const sessions = pgTable(
  'sessions',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    profileId: varchar('profile_id', { length: 40 })
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('sessions_profile_idx').on(table.profileId)],
);

// Un lien envoyé par e-mail (confirmation d'adresse, nouveau mot de passe), à usage unique.
export const authTokens = pgTable('auth_tokens', {
  id: varchar('id', { length: 64 }).primaryKey(),
  profileId: varchar('profile_id', { length: 40 })
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  purpose: text('purpose', { enum: AUTH_TOKEN_PURPOSES }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── L'affaire : le dossier commun à tous les modules ───────────────────────────────────────
// Ces quatre tables sont partagées. Chaque module ajoute SES tables plus bas, dans sa section
// (audiences du tribunal, signalements, scénarios du détective…), sans modifier celles-ci.

// Une information suspecte et sa conclusion, quand elle en a une.
export const cases = pgTable(
  'cases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    // L'information telle qu'elle a été reçue.
    claim: text('claim').notNull(),
    // « fictional » : affaire d'exercice (détective, What If? à trois versions).
    kind: text('kind', { enum: CASE_KINDS }).notNull().default('real'),
    status: text('status', { enum: CASE_STATUSES }).notNull().default('open'),
    // Vides tant que l'affaire n'est pas conclue.
    certainty: text('certainty', { enum: CERTAINTY_LEVELS }),
    conclusion: text('conclusion'),
    // Sert à reconnaître une information proche d'une affaire déjà jugée.
    embedding: vector('embedding', { dimensions: EMBEDDING_DIMENSIONS }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('cases_embedding_idx').using('hnsw', table.embedding.op('vector_cosine_ops'))],
);

// Une version retrouvée de l'information. `position` 1 = la plus ancienne retrouvée.
export const caseVersions = pgTable(
  'case_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    caseId: uuid('case_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    content: text('content').notNull(),
    sourceName: text('source_name').notNull(),
    sourceUrl: text('source_url'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    // Chemin d'une image dans web/public (ex. « /demo/inondation.jpg »), s'il y en a une.
    imagePath: text('image_path'),
  },
  (table) => [index('case_versions_case_idx').on(table.caseId)],
);

// Un lien du graphe : la version `to` reprend la version `from`, avec ce qui a changé.
export const versionLinks = pgTable(
  'version_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    caseId: uuid('case_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    fromVersionId: uuid('from_version_id')
      .notNull()
      .references(() => caseVersions.id, { onDelete: 'cascade' }),
    toVersionId: uuid('to_version_id')
      .notNull()
      .references(() => caseVersions.id, { onDelete: 'cascade' }),
    changeType: text('change_type', { enum: CHANGE_TYPES }).notNull(),
    note: text('note').notNull(),
    confidence: text('confidence', { enum: LINK_CONFIDENCES }).notNull(),
  },
  (table) => [index('version_links_case_idx').on(table.caseId)],
);

// Une pièce du dossier : une preuve sourcée, citée au tribunal par son numéro.
export const evidence = pgTable(
  'evidence',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    caseId: uuid('case_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    number: integer('number').notNull(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    sourceName: text('source_name').notNull(),
    sourceUrl: text('source_url'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    stance: text('stance', { enum: EVIDENCE_STANCES }).notNull(),
    strength: text('strength', { enum: EVIDENCE_STRENGTHS }).notNull(),
  },
  (table) => [index('evidence_case_idx').on(table.caseId)],
);

// ─── Tables des modules : chacun ajoute les siennes ici ─────────────────────────────────────

// Module Enquête : la recherche web d'une affaire, faite une fois. Les articles retenus sont
// enregistrés comme versions (`case_versions`, avec leur lien) et reliés dans `version_links`.
export const webSearches = pgTable('web_searches', {
  caseId: uuid('case_id')
    .primaryKey()
    .references(() => cases.id, { onDelete: 'cascade' }),
  status: text('status', { enum: WEB_SEARCH_STATUSES }).notNull(),
  // Articles proposés par la recherche, puis gardés car proches par le sens.
  foundCount: integer('found_count').notNull(),
  keptCount: integer('kept_count').notNull(),
  // Sources qui démentent l'information selon l'IA (comptées, pas ajoutées au graphe).
  contradictingCount: integer('contradicting_count').notNull().default(0),
  searchedAt: timestamp('searched_at', { withTimezone: true }).defaultNow().notNull(),
});

// Module Enquête : l'index de presse. Les derniers articles de journaux choisis, lus dans leurs
// flux RSS et enregistrés avec leur vecteur : la recherche d'une information s'y fait sans réseau.
export const newsArticles = pgTable(
  'news_articles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    url: text('url').notNull().unique(),
    title: text('title').notNull(),
    summary: text('summary').notNull(),
    sourceName: text('source_name').notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    // Vide quand l'IA était indisponible à la récolte : l'article reste trouvable par mots.
    embedding: vector('embedding', { dimensions: EMBEDDING_DIMENSIONS }),
    harvestedAt: timestamp('harvested_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('news_articles_embedding_idx').using('hnsw', table.embedding.op('vector_cosine_ops')),
  ],
);

// ─── Boîte d'alertes ───
// Un groupe réunit les signalements d'un même contenu, même formulé autrement. À
// REPORT_CASE_THRESHOLD signaleurs différents, une affaire est ouverte et liée au groupe.
export const reportGroups = pgTable(
  'report_groups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Le contenu en quelques mots, puis ce qu'il affirme (repris comme titre et texte de l'affaire).
    title: text('title').notNull(),
    summary: text('summary').notNull(),
    // Publication du fil signalée, quand le signalement vient du fil. Pas encore de clé étrangère :
    // la table du fil (`feed_posts`) arrive avec le module Fil d'actualité.
    feedPostId: uuid('feed_post_id'),
    // Vide tant que le seuil n'est pas atteint.
    caseId: uuid('case_id').references(() => cases.id, { onDelete: 'set null' }),
    // Vide quand l'IA était indisponible : le groupe reste trouvable par mots.
    embedding: vector('embedding', { dimensions: EMBEDDING_DIMENSIONS }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('report_groups_feed_post_idx').on(table.feedPostId),
    index('report_groups_embedding_idx').using('hnsw', table.embedding.op('vector_cosine_ops')),
  ],
);

// Un signalement : qui, quoi, pourquoi. Son état se déduit de son groupe (voir domain.ts).
export const reports = pgTable(
  'reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => reportGroups.id, { onDelete: 'cascade' }),
    reporterId: varchar('reporter_id', { length: 40 })
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    // Le texte signalé tel que la personne l'a vu (vide si elle n'a donné qu'un lien).
    content: text('content').notNull().default(''),
    url: text('url'),
    feedPostId: uuid('feed_post_id'),
    reason: text('reason', { enum: REPORT_REASONS }).notNull(),
    description: text('description').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // Une personne compte une seule fois par groupe.
    unique('reports_group_reporter_unique').on(table.groupId, table.reporterId),
    index('reports_reporter_idx').on(table.reporterId, table.createdAt),
  ],
);

// ─── Tribunal (lot de Mahery) ────────────────────────────────────────────────────────────────

export type Pleading = { argument: string; cited: number[] };
export type HearingFindings = { confirmed: string[]; contested: string[]; missing: string[] };

// Une audience : les deux plaidoiries, le vote du juré, puis la conclusion du juge.
export const hearings = pgTable(
  'hearings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    caseId: uuid('case_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    profileId: varchar('profile_id', { length: 40 })
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    status: text('status', { enum: HEARING_STATUSES }).notNull().default('pleaded'),
    prosecution: jsonb('prosecution').$type<Pleading>().notNull(),
    defense: jsonb('defense').$type<Pleading>().notNull(),
    pleadingsSource: text('pleadings_source', { enum: AI_SOURCES }).notNull(),
    vote: text('vote', { enum: VOTES }),
    certainty: text('certainty', { enum: CERTAINTY_LEVELS }),
    findings: jsonb('findings').$type<HearingFindings>(),
    conclusion: text('conclusion'),
    whatToCheck: text('what_to_check'),
    verdictSource: text('verdict_source', { enum: AI_SOURCES }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    concludedAt: timestamp('concluded_at', { withTimezone: true }),
  },
  (table) => [index('hearings_case_idx').on(table.caseId)],
);

// ─── Scan d'image et de vocal (lot de Mahery) ────────────────────────────────────────────────

export type MediaReport = {
  format: string;
  aiSignature: boolean;
  generator: string | null;
  c2pa: boolean;
  aiSourceType: boolean;
  stripped: boolean;
  takenAt: string | null;
  camera: string | null;
  software: string | null;
  gps: boolean;
  findings: string[];
};
export type AlreadySeen = {
  versionId: string;
  caseId: string;
  caseTitle: string;
  sourceName: string;
  publishedAt: string | null;
  distance: number;
};
export type ImageReading = { description: string; observations: string[]; textInImage: string };
export type Transcript = {
  transcript: string;
  language: string;
  translation: string;
  claim: string;
};

// Un fichier examiné : ce que dit le fichier, s'il a déjà été vu, ce qu'en lit l'IA.
export const scans = pgTable('scans', {
  id: uuid('id').primaryKey().defaultRandom(),
  profileId: varchar('profile_id', { length: 40 })
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  kind: text('kind', { enum: MEDIA_KINDS }).notNull(),
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type').notNull(),
  sha256: varchar('sha256', { length: 64 }).notNull(),
  report: jsonb('report').$type<MediaReport>(),
  alreadySeen: jsonb('already_seen').$type<AlreadySeen>(),
  reading: jsonb('reading').$type<ImageReading>(),
  transcript: jsonb('transcript').$type<Transcript>(),
  outcome: text('outcome', { enum: SCAN_OUTCOMES }),
  aiSource: text('ai_source', { enum: AI_SOURCES }),
  // L'affaire à laquelle le scan a été versé, ou celle qu'il a ouverte.
  caseId: uuid('case_id').references(() => cases.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── Jeu vrai ou fake ───

// Un indice à retourner : ce qu'il montre, et s'il fallait le juger fiable.
export type ScenarioClue = { kind: ClueKind; content: string; reliable: boolean };
// Une réponse du joueur dans une partie.
export type RunAnswer = {
  scenarioId: string;
  answer: GameAnswer;
  correct: boolean;
  ratings: Partial<Record<ClueKind, ClueRating>>;
};

// Une information du jeu, présentée comme une publication du fil. Toutes sont inventées.
export const scenarios = pgTable('scenarios', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Ordre dans la série : les trois premières sont celles jouées avec la salle.
  position: integer('position').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  sourceName: text('source_name').notNull(),
  // Chemin d'une image dans web/public, s'il y en a une.
  imagePath: text('image_path'),
  // L'affaire de démo qui porte la même information, quand elle existe.
  caseId: uuid('case_id').references(() => cases.id, { onDelete: 'set null' }),
  clues: jsonb('clues').$type<ScenarioClue[]>().notNull(),
  answer: text('answer', { enum: GAME_ANSWERS }).notNull(),
  // Ce qu'il fallait voir, puis le réflexe à garder.
  explanation: text('explanation').notNull(),
  reflex: text('reflex').notNull(),
});

// Une série jouée : les réponses et le score (nombre de bonnes réponses sur `total`).
export const gameRuns = pgTable(
  'game_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    profileId: varchar('profile_id', { length: 40 })
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    answers: jsonb('answers').$type<RunAnswer[]>().notNull(),
    score: integer('score').notNull(),
    total: integer('total').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('game_runs_profile_idx').on(table.profileId)],
);

export type Profile = typeof profiles.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type Case = typeof cases.$inferSelect;
export type CaseVersion = typeof caseVersions.$inferSelect;
export type VersionLink = typeof versionLinks.$inferSelect;
export type Evidence = typeof evidence.$inferSelect;
export type WebSearch = typeof webSearches.$inferSelect;
export type ReportGroup = typeof reportGroups.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type Hearing = typeof hearings.$inferSelect;
export type Scan = typeof scans.$inferSelect;
export type Scenario = typeof scenarios.$inferSelect;
export type GameRun = typeof gameRuns.$inferSelect;
