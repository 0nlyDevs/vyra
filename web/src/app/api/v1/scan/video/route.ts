import { analyzeVideo } from '@/features/scan/actions';
import { apiFail, apiResult, requireApiProfile } from '@/server/api';

// Scan d'une vidéo (multipart, champ `file`) : même analyse que le site (ffmpeg, images clés
// protégées, bande son transcrite). Les images clés reviennent en data URL, jamais gardées en base.
export async function POST(request: Request) {
  const auth = await requireApiProfile();
  if ('response' in auth) return auth.response;
  const form = await request.formData().catch(() => null);
  if (!form) return apiFail('VALIDATION_FAILED');
  return apiResult(await analyzeVideo(form));
}
