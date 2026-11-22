import 'server-only';
import { cookies } from 'next/headers';
import type { FeedRegion } from '@/lib/domain';
import { feedRegionSchema } from './schema';

// La région du fil est gardée dans un cookie : choisie à la première visite, modifiable ensuite.
export const REGION_COOKIE = 'vyra_region';
export const REGION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

// `null` : pas encore choisie (la page propose alors le choix).
export async function getFeedRegion(): Promise<FeedRegion | null> {
  const value = (await cookies()).get(REGION_COOKIE)?.value;
  const parsed = feedRegionSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
