import { transcribeAudio } from '@/features/scan/actions';
import { apiFail, apiResult, requireApiProfile } from '@/server/api';

// Scan d'un vocal (multipart, champ `file`) : même transcription que l'onglet « Vocal » du site,
// avec l'affaire déjà jugée qui lui ressemble. Pour en faire une enquête : `POST /scans/:id/open-case`.
export async function POST(request: Request) {
  const auth = await requireApiProfile();
  if ('response' in auth) return auth.response;
  const form = await request.formData().catch(() => null);
  if (!form) return apiFail('VALIDATION_FAILED');
  return apiResult(await transcribeAudio(form));
}
