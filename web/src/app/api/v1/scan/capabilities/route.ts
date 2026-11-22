import { apiOk, requireApiProfile } from '@/server/api';
import { videoAvailable } from '@/server/processing';

// Ce que le scan sait faire sur ce serveur : `video` dit si ffmpeg est là pour les vidéos.
export async function GET() {
  const auth = await requireApiProfile();
  if ('response' in auth) return auth.response;
  return apiOk({ video: await videoAvailable() });
}
