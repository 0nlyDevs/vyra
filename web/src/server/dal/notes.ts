import 'server-only';
import { and, cosineDistance, desc, eq, ilike, isNotNull } from 'drizzle-orm';
import { db } from '@/server/db';
import { notes } from '@/server/db/schema';

export function listNotes(profileId: string) {
  return db
    .select({ id: notes.id, content: notes.content, createdAt: notes.createdAt })
    .from(notes)
    .where(eq(notes.profileId, profileId))
    .orderBy(desc(notes.createdAt));
}

export async function createNote(input: {
  profileId: string;
  content: string;
  embedding: number[] | null;
}) {
  const [note] = await db.insert(notes).values(input).returning({ id: notes.id });
  return note;
}

// Recherche par le sens (pgvector) quand on a le vecteur de la question, sinon par mots.
export function searchNotes(profileId: string, query: string, queryEmbedding: number[] | null) {
  const columns = { id: notes.id, content: notes.content, createdAt: notes.createdAt };
  if (queryEmbedding) {
    return db
      .select(columns)
      .from(notes)
      .where(and(eq(notes.profileId, profileId), isNotNull(notes.embedding)))
      .orderBy(cosineDistance(notes.embedding, queryEmbedding))
      .limit(5);
  }
  // `%` et `_` tapés par la personne sont pris à la lettre.
  const pattern = `%${query.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
  return db
    .select(columns)
    .from(notes)
    .where(and(eq(notes.profileId, profileId), ilike(notes.content, pattern)))
    .orderBy(desc(notes.createdAt))
    .limit(5);
}
