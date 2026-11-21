import { z } from 'zod';
import { FEED_VIEWS } from '@/lib/domain';

export const openFromPostSchema = z.object({
  postId: z.uuid(),
  target: z.enum(['case', 'court']),
});

export const feedViewSchema = z.enum(FEED_VIEWS).catch('all');
