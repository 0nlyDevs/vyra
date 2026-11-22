import { z } from 'zod';
import { demoMode } from '@/lib/env';
import { apiFail, apiOk, apiSession, readJson } from '@/server/api';
import { getProfile } from '@/server/dal/profiles';
import { DEMO_PROFILES } from '@/server/demo/seed-data';

// Comptes de démo en un clic, comme sur la page de connexion du site : seulement en mode démo.
// `GET` : la liste (vide hors démo) ; `POST { profileId }` : la session de ce compte.
const profileIdSchema = z.enum(DEMO_PROFILES.map((profile) => profile.id));

export async function GET() {
  return apiOk({ profiles: demoMode ? DEMO_PROFILES : [] });
}

export async function POST(request: Request) {
  if (!demoMode) return apiFail('FORBIDDEN');
  const body = (await readJson(request)) as Record<string, unknown> | null;
  const parsed = profileIdSchema.safeParse(body?.profileId);
  if (!parsed.success) return apiFail('VALIDATION_FAILED');
  const profile = await getProfile(parsed.data);
  if (!profile) return apiFail('NOT_FOUND');
  return apiOk(await apiSession(profile));
}
