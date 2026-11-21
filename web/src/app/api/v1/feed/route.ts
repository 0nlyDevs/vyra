import { FEED_MAX_AGE_MS } from '@/features/feed/harvest';
import { feedRegionSchema } from '@/features/feed/schema';
import { apiFail, apiOk, requireApiProfile } from '@/server/api';
import { listFeedItems } from '@/server/dal/feed';

// Le fil d'actualité, comme sur le site : `?region=mg` (Madagascar et monde, par défaut) ou
// `?region=world`. Les 7 derniers jours, chaque publication avec son affaire et ses signalements.
export async function GET(request: Request) {
  const auth = await requireApiProfile();
  if ('response' in auth) return auth.response;
  const raw = new URL(request.url).searchParams.get('region') ?? 'mg';
  const region = feedRegionSchema.safeParse(raw);
  if (!region.success) return apiFail('VALIDATION_FAILED', { region: ['« mg » ou « world »'] });
  const regions = region.data === 'world' ? (['world'] as const) : (['mg', 'world'] as const);
  const items = await listFeedItems([...regions], new Date(Date.now() - FEED_MAX_AGE_MS));
  return apiOk({ region: region.data, items });
}
