import 'server-only';
import {
  createHash,
  createPrivateKey,
  createPublicKey,
  type KeyObject,
  sign,
  verify,
} from 'node:crypto';
import type { CertaintyLevel } from '@/lib/domain';
import { env } from '@/lib/env';

// Le sceau d'une conclusion : une signature Ed25519 sur le texte exact de l'affaire jugée
// (information, niveau de certitude, conclusion). La carte partagée porte la signature dans son
// QR code et un code court à taper. Qui modifie un mot de la carte, ou imite la marque, n'a pas
// la clé : le sceau ne correspond plus. Rien n'est stocké : la signature se recalcule.

export type SealedContent = {
  id: string;
  claim: string;
  certainty: CertaintyLevel;
  conclusion: string;
};

// En-tête DER d'une clé privée Ed25519 (PKCS#8) : suivi des 32 octets de la graine.
const PKCS8_ED25519 = Buffer.from('302e020100300506032b657004220420', 'hex');
const DEV_SEED = 'vyra-dev-seal-key-not-for-production';
// Alphabet de Crockford : sans I, L, O ni U, pour un code qu'on recopie sans confusion.
const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

let keys: { privateKey: KeyObject; publicKey: KeyObject } | null | undefined;

function sealKeys() {
  if (keys !== undefined) return keys;
  const secret = env.SEAL_SECRET ?? (env.NODE_ENV === 'production' ? null : DEV_SEED);
  if (!secret) {
    keys = null;
    return keys;
  }
  const seed = createHash('sha256').update(secret).digest();
  const privateKey = createPrivateKey({
    key: Buffer.concat([PKCS8_ED25519, seed]),
    format: 'der',
    type: 'pkcs8',
  });
  keys = { privateKey, publicKey: createPublicKey(privateKey) };
  return keys;
}

// Le texte signé : toujours le même pour le même contenu (ordre fixe, version en tête).
function payload(content: SealedContent) {
  return Buffer.from(
    JSON.stringify([
      'vyra-seal',
      1,
      content.id,
      content.claim,
      content.certainty,
      content.conclusion,
    ]),
  );
}

export function sealAvailable() {
  return sealKeys() !== null;
}

// La signature, en base64url (86 caractères), ou null si aucune clé n'est configurée.
export function signConclusion(content: SealedContent): string | null {
  const current = sealKeys();
  if (!current) return null;
  return sign(null, payload(content), current.privateKey).toString('base64url');
}

export function verifyConclusion(content: SealedContent, signature: string): boolean {
  const current = sealKeys();
  if (!current || !/^[A-Za-z0-9_-]{86}$/.test(signature)) return false;
  return verify(null, payload(content), current.publicKey, Buffer.from(signature, 'base64url'));
}

// « VY-7K2M-Q9XD » : 40 bits tirés de la signature, à lire au téléphone ou par SMS.
export function sealCode(signature: string) {
  const hash = createHash('sha256').update(signature).digest();
  let bits = 0n;
  for (const byte of hash.subarray(0, 5)) bits = (bits << 8n) | BigInt(byte);
  let code = '';
  for (let index = 0; index < 8; index += 1) {
    code = CODE_ALPHABET[Number(bits & 31n)] + code;
    bits >>= 5n;
  }
  return `VY-${code.slice(0, 4)}-${code.slice(4)}`;
}

// Un code tapé à la main : majuscules, tirets ignorés, O lu comme 0, I et L comme 1.
export function normalizeSealCode(input: string) {
  const raw = input
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .replace(/^VY/, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
  if (raw.length !== 8 || [...raw].some((char) => !CODE_ALPHABET.includes(char))) return null;
  return `VY-${raw.slice(0, 4)}-${raw.slice(4)}`;
}

// La clé publique, pour qu'un tiers vérifie sans nous faire confiance.
export function publicKeyJwk() {
  const current = sealKeys();
  return current ? current.publicKey.export({ format: 'jwk' }) : null;
}
