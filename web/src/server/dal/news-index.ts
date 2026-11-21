import 'server-only';
import { cosineDistance, count, desc, eq, inArray, isNotNull, isNull, max } from 'drizzle-orm';
import { db } from '@/server/db';
import { newsArticles } from '@/server/db/schema';

// L'index de presse : articles récoltés dans les flux RSS, cherchés par le sens ou par mots.

export async function getNewsIndexState() {
  const [state] = await db
    .select({
      total: count(),
      // count(colonne) ne compte que les lignes où elle est remplie.
      embedded: count(newsArticles.embedding),
      lastHarvest: max(newsArticles.harvestedAt),
    })
    .from(newsArticles);
  return {
    total: state?.total ?? 0,
    embedded: state?.embedded ?? 0,
    lastHarvest: state?.lastHarvest ?? null,
  };
}

export async function listKnownNewsUrls(urls: string[]) {
  if (urls.length === 0) return new Set<string>();
  const rows = await db
    .select({ url: newsArticles.url })
    .from(newsArticles)
    .where(inArray(newsArticles.url, urls));
  return new Set(rows.map((row) => row.url));
}

export async function addNewsArticles(rows: (typeof newsArticles.$inferInsert)[]) {
  if (rows.length === 0) return;
  await db.insert(newsArticles).values(rows).onConflictDoNothing({ target: newsArticles.url });
}

// Date de la dernière récolte, même sans nouvel article : on la note sur l'article le plus récent.
export async function touchNewsHarvest() {
  const [latest] = await db
    .select({ id: newsArticles.id })
    .from(newsArticles)
    .orderBy(desc(newsArticles.harvestedAt))
    .limit(1);
  if (!latest) return;
  await db
    .update(newsArticles)
    .set({ harvestedAt: new Date() })
    .where(eq(newsArticles.id, latest.id));
}

// Articles récoltés quand l'IA ne répondait pas : leur vecteur reste à calculer.
export function listNewsWithoutEmbedding(limit: number) {
  return db
    .select({ id: newsArticles.id, title: newsArticles.title, summary: newsArticles.summary })
    .from(newsArticles)
    .where(isNull(newsArticles.embedding))
    .orderBy(desc(newsArticles.publishedAt))
    .limit(limit);
}

export async function setNewsEmbeddings(items: { id: string; embedding: number[] }[]) {
  await db.transaction(async (tx) => {
    for (const item of items) {
      await tx
        .update(newsArticles)
        .set({ embedding: item.embedding })
        .where(eq(newsArticles.id, item.id));
    }
  });
}

const columns = {
  url: newsArticles.url,
  title: newsArticles.title,
  summary: newsArticles.summary,
  sourceName: newsArticles.sourceName,
  publishedAt: newsArticles.publishedAt,
};

// Les articles les plus proches par le sens, avec leur distance (0 = identique).
export async function findNewsByMeaning(embedding: number[], limit: number) {
  const distance = cosineDistance(newsArticles.embedding, embedding);
  const rows = await db
    .select({ ...columns, distance })
    .from(newsArticles)
    .where(isNotNull(newsArticles.embedding))
    .orderBy(distance)
    .limit(limit);
  return rows.map((row) => ({ ...row, distance: Number(row.distance) }));
}

// Les articles les plus récents, pour la recherche par mots quand l'IA ne répond pas.
export function listRecentNews(limit: number) {
  return db.select(columns).from(newsArticles).orderBy(desc(newsArticles.publishedAt)).limit(limit);
}

export type IndexedNews = Awaited<ReturnType<typeof listRecentNews>>[number];
