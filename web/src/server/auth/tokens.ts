import 'server-only';
import { createHash, randomBytes } from 'node:crypto';

// Jeton tiré au hasard (cookie de session, lien d'e-mail). La base ne garde que son empreinte :
// une copie de la base ne permet ni d'ouvrir une session ni d'utiliser un lien.

export function newToken() {
  return randomBytes(32).toString('base64url');
}

export function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
