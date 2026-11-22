import 'server-only';
import { asc, desc, eq } from 'drizzle-orm';
import type { DirectoryEntry } from '@/features/impersonation/check';
import { db } from '@/server/db';
import { type InstitutionChannels, institutionNotices, institutions } from '@/server/db/schema';

// Accès à l'annuaire officiel : les institutions, leurs canaux et leurs communiqués d'origine.

export async function listDirectory(): Promise<DirectoryEntry[]> {
  const [rows, notices] = await Promise.all([
    db.select().from(institutions).orderBy(asc(institutions.name)),
    db
      .select()
      .from(institutionNotices)
      .orderBy(desc(institutionNotices.publishedAt), desc(institutionNotices.createdAt)),
  ]);
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    aliases: row.aliases,
    channels: row.channels,
    never: row.never,
    notices: notices
      .filter((notice) => notice.institutionId === row.id)
      .map((notice) => ({
        id: notice.id,
        title: notice.title,
        content: notice.content,
        publishedAt: notice.publishedAt,
      })),
  }));
}

export async function createInstitution(input: {
  name: string;
  aliases: string[];
  channels: InstitutionChannels;
  never: string;
}) {
  const [created] = await db.insert(institutions).values(input).returning({ id: institutions.id });
  return created?.id ?? null;
}

export async function deleteInstitution(id: string) {
  const deleted = await db
    .delete(institutions)
    .where(eq(institutions.id, id))
    .returning({ id: institutions.id });
  return deleted.length > 0;
}

export async function createNotice(input: {
  institutionId: string;
  title: string;
  content: string;
  sourceUrl: string | null;
  publishedAt: Date | null;
}) {
  const [found] = await db
    .select({ id: institutions.id })
    .from(institutions)
    .where(eq(institutions.id, input.institutionId))
    .limit(1);
  if (!found) return null;
  const [created] = await db
    .insert(institutionNotices)
    .values(input)
    .returning({ id: institutionNotices.id });
  return created?.id ?? null;
}

export async function deleteNotice(id: string) {
  const deleted = await db
    .delete(institutionNotices)
    .where(eq(institutionNotices.id, id))
    .returning({ id: institutionNotices.id });
  return deleted.length > 0;
}
