import { apiFail, apiOk } from '@/server/api';
import { publicKeyJwk } from '@/server/seal';

// La clé publique des sceaux (JWK, Ed25519), sans compte. Le texte signé est le JSON
// ["vyra-seal", 1, id, information, niveau, conclusion] ; la signature est le paramètre `s`
// du lien du QR, en base64url.
export function GET() {
  const key = publicKeyJwk();
  if (!key) return apiFail('NOT_FOUND');
  return apiOk({ algorithm: 'Ed25519', format: 'vyra-seal/1', key });
}
