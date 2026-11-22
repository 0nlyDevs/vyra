import 'server-only';
import {
  and,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  max,
  notInArray,
  or,
  sql,
} from 'drizzle-orm';
import type { CaseStatus, CertaintyLevel, FeedKind, FeedRegion, ReportState } from '@/lib/domain';
import { getReportStatsByFeedPost } from '@/server/dal/reports';
import { db } from '@/server/db';
import { cases, feedPosts, reportGroups } from '@/server/db/schema';

// Lecture et récolte du fil : chaque publication réelle avec son affaire et ses signalements.

export type FeedCase = {
  id: string;
  status: CaseStatus;
  certainty: CertaintyLevel | null;
  conclusion: string | null;
};

export type FeedItem = {
  id: string;
  url: string;
  kind: FeedKind;
  region: FeedRegion;
  sourceName: string;
  author: string | null;
  title: string | null;
  body: string;
  imageUrl: string | null;
  reach: number | null;
  publishedAt: Date;
  // L'affaire de la publication, ou à défaut celle qu'ont ouverte ses signalements.
  case: FeedCase | null;
  reporterCount: number;
  reportState: ReportState | null;
};

export type NewFeedPost = typeof feedPosts.$inferInsert;

const caseColumns = {
  id: cases.id,
  status: cases.status,
  certainty: cases.certainty,
  conclusion: cases.conclusion,
};

// Publications récentes des régions demandées (et toutes celles qui ont une affaire).
export async function listFeedItems(regions: FeedRegion[], since: Date): Promise<FeedItem[]> {
  const posts = await db
    .select()
    .from(feedPosts)
    .where(
      and(
        inArray(feedPosts.region, regions),
        or(gte(feedPosts.publishedAt, since), sql`${feedPosts.caseId} is not null`),
      ),
    )
    .orderBy(desc(feedPosts.publishedAt))
    .limit(500);
  const stats = await getReportStatsByFeedPost(posts.map((post) => post.id));
  const statsByPost = new Map(stats.map((stat) => [stat.feedPostId, stat]));

  const caseIds = new Set<string>();
  for (const post of posts) {
    const caseId = post.caseId ?? statsByPost.get(post.id)?.caseId;
    if (caseId) caseIds.add(caseId);
  }
  const caseRows =
    caseIds.size > 0
      ? await db
          .select(caseColumns)
          .from(cases)
          .where(inArray(cases.id, [...caseIds]))
      : [];
  const caseById = new Map(caseRows.map((row) => [row.id, row]));

  return posts.map((post) => {
    const stat = statsByPost.get(post.id);
    const caseId = post.caseId ?? stat?.caseId ?? null;
    return {
      id: post.id,
      url: post.url,
      kind: post.kind,
      region: post.region,
      sourceName: post.sourceName,
      author: post.author,
      title: post.title,
      body: post.body,
      imageUrl: post.imageUrl,
      reach: post.reach,
      publishedAt: post.publishedAt,
      case: caseId ? (caseById.get(caseId) ?? null) : null,
      reporterCount: stat?.reporterCount ?? 0,
      reportState: stat?.state ?? null,
    };
  });
}

// Dernière récolte : de toutes les sources, et de Facebook (recherche payée en crédits Tavily).
export async function getFeedFreshness() {
  const [row] = await db
    .select({
      all: max(feedPosts.seenAt),
      facebook: sql<Date | null>`max(${feedPosts.seenAt}) filter (where ${feedPosts.kind} = 'facebook')`,
    })
    .from(feedPosts);
  return {
    all: row?.all ?? null,
    facebook: row?.facebook ? new Date(row.facebook) : null,
  };
}

// Ajoute les nouvelles publications ; celles déjà connues gardent leur date et leur affaire,
// leur texte, leur image et leur portée sont mis à jour. Renvoie le nombre de nouvelles.
export async function upsertFeedPosts(rows: NewFeedPost[]) {
  if (rows.length === 0) return 0;
  const known = await db
    .select({ url: feedPosts.url })
    .from(feedPosts)
    .where(
      inArray(
        feedPosts.url,
        rows.map((row) => row.url),
      ),
    );
  const knownUrls = new Set(known.map((row) => row.url));
  await db
    .insert(feedPosts)
    .values(rows)
    .onConflictDoUpdate({
      target: feedPosts.url,
      set: {
        title: sql`excluded.title`,
        body: sql`excluded.body`,
        imageUrl: sql`coalesce(excluded.image_url, ${feedPosts.imageUrl})`,
        author: sql`excluded.author`,
        reach: sql`excluded.reach`,
        seenAt: sql`now()`,
      },
    });
  return rows.filter((row) => !knownUrls.has(row.url)).length;
}

// Oublie les publications que plus aucune source ne montre, sauf celles qui ont une affaire.
export async function pruneFeedPosts(notSeenSince: Date) {
  // Une publication signalée reste, même sans affaire : ses signalements la retrouvent par son id.
  const reported = db
    .select({ id: reportGroups.feedPostId })
    .from(reportGroups)
    .where(isNotNull(reportGroups.feedPostId));
  await db
    .delete(feedPosts)
    .where(
      and(
        lt(feedPosts.seenAt, notSeenSince),
        isNull(feedPosts.caseId),
        notInArray(feedPosts.id, reported),
      ),
    );
}

// Publications récentes dont le sens reste à calculer, les plus récentes d'abord.
export function listFeedPostsWithoutEmbedding(since: Date, limit: number) {
  return db
    .select({ id: feedPosts.id, title: feedPosts.title, body: feedPosts.body })
    .from(feedPosts)
    .where(and(isNull(feedPosts.embedding), gte(feedPosts.publishedAt, since)))
    .orderBy(desc(feedPosts.publishedAt))
    .limit(limit);
}

export async function setFeedEmbeddings(items: { id: string; embedding: number[] }[]) {
  await db.transaction(async (tx) => {
    for (const item of items) {
      await tx
        .update(feedPosts)
        .set({ embedding: item.embedding })
        .where(eq(feedPosts.id, item.id));
    }
  });
}

// Paires de publications proches par le sens, venues de deux sources différentes.
export async function listFeedPairs(regions: FeedRegion[], since: Date, maxDistance: number) {
  // postgres-js reçoit la date en texte : un objet Date n'est pas converti dans une requête brute.
  const sinceIso = since.toISOString();
  const regionList = sql.join(
    regions.map((region) => sql`${region}`),
    sql`, `,
  );
  const rows = await db.execute<{ a: string; b: string }>(sql`
    select a.id as a, b.id as b
    from ${feedPosts} a
    join ${feedPosts} b
      on a.id < b.id
      and a.source_name <> b.source_name
      and (a.embedding <=> b.embedding) <= ${maxDistance}
    where a.embedding is not null and b.embedding is not null
      and a.published_at >= ${sinceIso} and b.published_at >= ${sinceIso}
      and a.region in (${regionList}) and b.region in (${regionList})
  `);
  return [...rows].map((row) => [row.a, row.b] as const);
}

export async function getFeedPost(id: string) {
  const [post] = await db.select().from(feedPosts).where(eq(feedPosts.id, id)).limit(1);
  return post ?? null;
}

export async function linkPostToCase(postId: string, caseId: string) {
  await db.update(feedPosts).set({ caseId }).where(eq(feedPosts.id, postId));
}
