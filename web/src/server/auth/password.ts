import 'server-only';
import { randomBytes, type ScryptOptions, scrypt, timingSafeEqual } from 'node:crypto';

// Mots de passe protégés avec scrypt (intégré à Node, aucun paquet). Format enregistré :
// scrypt$N$r$p$sel$empreinte (sel et empreinte en base64url).

// Réglages du minimum de l'OWASP (N = 2^17, r = 8, p = 1) : environ 128 Mo et une fraction de
// seconde par calcul, ce qui rend coûteux de deviner à la chaîne une empreinte volée. Les
// empreintes plus anciennes (N = 2^14) restent lisibles et sont refaites à la connexion.
const PARAMS = { N: 2 ** 17, r: 8, p: 1 } as const;
const KEY_LENGTH = 64;
// Node refuse au-delà de 32 Mo par défaut ; 128 × N × r octets sont nécessaires, plus une marge.
const MAX_MEMORY = 256 * 1024 * 1024;

function derive(password: string, salt: Buffer, options: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) => {
    const withMemory = { ...options, maxmem: MAX_MEMORY };
    scrypt(password.normalize('NFKC'), salt, KEY_LENGTH, withMemory, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await derive(password, salt, PARAMS);
  return [
    'scrypt',
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString('base64url'),
    key.toString('base64url'),
  ].join('$');
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, n, r, p, salt, key] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !key) return false;
  const expected = Buffer.from(key, 'base64url');
  const actual = await derive(password, Buffer.from(salt, 'base64url'), {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// L'empreinte a été faite avec des réglages plus faibles que les actuels : à refaire.
export function needsRehash(stored: string) {
  const [scheme, n, r, p] = stored.split('$');
  return (
    scheme !== 'scrypt' || Number(n) < PARAMS.N || Number(r) < PARAMS.r || Number(p) < PARAMS.p
  );
}

// Empreinte factice : vérifier un mot de passe prend le même temps, que le compte existe ou non.
let dummyHash: Promise<string> | null = null;
export function dummyPasswordHash() {
  dummyHash ??= hashPassword('vyra-dummy-password');
  return dummyHash;
}
