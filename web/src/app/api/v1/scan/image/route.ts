import { analyzeImage } from '@/features/scan/actions';
import { IMAGE_TYPES, MAX_FILE_BYTES } from '@/features/scan/schema';
import { findMatchesOnServer } from '@/features/scan/server-matches';
import { apiFail, apiResult, requireApiProfile } from '@/server/api';

// Scan d'une image (multipart, champ `file`) : même analyse que le site. « Déjà vue » est calculé
// ici (empreinte par processing), l'application n'ayant pas le canvas du navigateur. La réponse
// porte la copie protégée (`safeCopy.dataUrl`), jamais gardée en base.
export async function POST(request: Request) {
  const auth = await requireApiProfile();
  if ('response' in auth) return auth.response;
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File) || file.size === 0) return apiFail('VALIDATION_FAILED');
  if (file.size > MAX_FILE_BYTES) return apiFail('FILE_TOO_LARGE');
  if (!IMAGE_TYPES.includes(file.type)) return apiFail('FILE_NOT_SUPPORTED');

  const data = Buffer.from(await file.arrayBuffer()).toString('base64');
  const matches = await findMatchesOnServer({ mimeType: file.type, data });
  const formData = new FormData();
  formData.set('file', file);
  formData.set('matches', JSON.stringify(matches));
  return apiResult(await analyzeImage(formData));
}
