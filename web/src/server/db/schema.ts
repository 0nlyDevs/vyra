import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
  vector,
} from 'drizzle-orm/pg-core';
// Chemin relatif (et non `@/lib/…`) : drizzle-kit lit ce fichier sans les alias de tsconfig.
import {
  CASE_KINDS,
  CASE_STATUSES,
  CERTAINTY_LEVELS,
  CHANGE_TYPES,
  EVIDENCE_STANCES,
  EVIDENCE_STRENGTHS,
  LINK_CONFIDENCES,
  PROFILE_ROLES,
  REPORT_REASONS,
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

export type Profile = typeof profiles.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type Case = typeof cases.$inferSelect;
export type CaseVersion = typeof caseVersions.$inferSelect;
export type VersionLink = typeof versionLinks.$inferSelect;
export type Evidence = typeof evidence.$inferSelect;
export type ReportGroup = typeof reportGroups.$inferSelect;
export type Report = typeof reports.$inferSelect;
