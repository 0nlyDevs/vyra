import { z } from 'zod';
import { FEED_REGIONS, FEED_VIEWS } from '@/lib/domain';

export const openFromPostSchema = z.object({
  postId: z.uuid(),
  target: z.enum(['case', 'court']),
});

export const feedViewSchema = z.enum(FEED_VIEWS).catch('all');

// Sujet affiché seul (`?sujet=<id d'une publication du sujet>`).
export const feedTopicSchema = z.uuid().optional().catch(undefined);

export const feedRegionSchema = z.enum(FEED_REGIONS);

export const chooseRegionSchema = z.object({ region: feedRegionSchema });
