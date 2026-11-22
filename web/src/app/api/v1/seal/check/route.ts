import { z } from 'zod';
import { checkCode, checkSignature, type SealCheck } from '@/features/seal/check';
import { apiFail, apiOk } from '@/server/api';
import { normalizeSealCode } from '@/server/seal';

// Vérifier un sceau, sans compte, comme la page /verifier/sceau : `?c=<id>&s=<signature>` (le lien
// du QR) ou `?code=VY-XXXX-XXXX` (le code tapé). Réponse : `{ status, content?, code? }`, où
// `status` vaut genuine, mismatch ou unknown.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const c = params.get('c');
  const s = params.get('s');
  const code = params.get('code');
  let check: SealCheck | null = null;
  if (c && s && z.uuid().safeParse(c).success) {
    check = await checkSignature(c, s.slice(0, 120));
  } else if (code) {
    const normalized = normalizeSealCode(code);
    if (!normalized)
      return apiFail('VALIDATION_FAILED', { code: ['Un code a huit caractères : VY-XXXX-XXXX.'] });
    check = await checkCode(normalized);
  }
  return check ? apiOk(check) : apiFail('VALIDATION_FAILED');
}
