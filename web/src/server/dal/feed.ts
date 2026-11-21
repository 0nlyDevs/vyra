import 'server-only';
import { desc, eq, inArray } from 'drizzle-orm';
import type { CaseStatus, CertaintyLevel, ReportState } from '@/lib/domain';
import { getReportStatsByFeedPost } from '@/server/dal/reports';
import { db } from '@/server/db';
import { cases, feedPosts } from '@/server/db/schema';

// Lecture du fil : chaque publication avec son affaire et ses signalements.

export type FeedCase = {
  id: string;
  status: CaseStatus;
  certainty: CertaintyLevel | null;
  conclusion: string | null;
};

export type FeedItem = {
  id: string;
  sourceName: string;
  body: string;
  sourceUrl: string | null;
  imagePath: string | null;
  publishedAt: Date;
  // L'affaire de la publication, ou à défaut celle qu'ont ouverte ses signalements.
  case: FeedCase | null;
  reporterCount: number;
  reportState: ReportState | null;
};

const caseColumns = {
  id: cases.id,
  status: cases.status,
  certainty: cases.certainty,
  conclusion: cases.conclusion,
};

export async function listFeedItems(): Promise<FeedItem[]> {
  const posts = await db.select().from(feedPosts).orderBy(desc(feedPosts.publishedAt));
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
      sourceName: post.sourceName,
      body: post.body,
      sourceUrl: post.sourceUrl,
      imagePath: post.imagePath,
      publishedAt: post.publishedAt,
      case: caseId ? (caseById.get(caseId) ?? null) : null,
      reporterCount: stat?.reporterCount ?? 0,
      reportState: stat?.state ?? null,
    };
  });
}

export async function getFeedPost(id: string) {
  const [post] = await db.select().from(feedPosts).where(eq(feedPosts.id, id)).limit(1);
  return post ?? null;
}

export async function linkPostToCase(postId: string, caseId: string) {
  await db.update(feedPosts).set({ caseId }).where(eq(feedPosts.id, postId));
}
