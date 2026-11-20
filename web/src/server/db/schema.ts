import { index, pgTable, text, timestamp, uuid, varchar, vector } from 'drizzle-orm/pg-core';
// Chemin relatif (et non `@/lib/…`) : drizzle-kit lit ce fichier sans les alias de tsconfig.
import { PROFILE_ROLES } from '../../lib/domain';

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

export type Profile = typeof profiles.$inferSelect;
export type Note = typeof notes.$inferSelect;
