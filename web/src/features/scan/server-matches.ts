import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { listKnownImages } from '@/server/dal/scans';
import { serverImageFingerprint } from '@/server/processing';
import { fingerprintDistance } from './fingerprint';
import { MAX_IMAGE_DISTANCE } from './schema';

// « Déjà vue » pour l'application mobile : la même comparaison que le navigateur du site, mais
// les empreintes sont calculées par processing. Les images des affaires sont lues une fois puis
// gardées en mémoire, par chemin.

const known = new Map<string, Promise<string | null>>();

const MIME_BY_EXTENSION: Record<string, string> = {
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

async function readKnownImage(imagePath: string): Promise<Buffer | null> {
  try {
    if (/^https?:\/\//.test(imagePath)) {
      const response = await fetch(imagePath, { signal: AbortSignal.timeout(10_000) });
      return response.ok ? Buffer.from(await response.arrayBuffer()) : null;
    }
    // Un chemin du site (« /demo/… ») : le fichier est dans public/, jamais au-dessus.
    const publicDir = path.join(process.cwd(), 'public');
    const file = path.join(publicDir, path.normalize(imagePath));
    if (!file.startsWith(publicDir + path.sep)) return null;
    return await readFile(file);
  } catch {
    return null;
  }
}

function knownFingerprint(imagePath: string) {
  let found = known.get(imagePath);
  if (!found) {
    found = readKnownImage(imagePath).then((bytes) => {
      if (!bytes) return null;
      const mimeType = MIME_BY_EXTENSION[path.extname(imagePath).toLowerCase()] ?? 'image/jpeg';
      return serverImageFingerprint({ mimeType, data: bytes.toString('base64') });
    });
    // Une lecture ratée sera retentée au prochain scan.
    found.then((value) => value === null && known.delete(imagePath));
    known.set(imagePath, found);
  }
  return found;
}

export async function findMatchesOnServer(file: { mimeType: string; data: string }) {
  const mine = await serverImageFingerprint(file);
  if (!mine) return [];
  const images = await listKnownImages();
  const results = await Promise.all(
    images.map(async ({ versionId, imagePath }) => {
      if (!imagePath) return null;
      const theirs = await knownFingerprint(imagePath);
      if (!theirs) return null;
      const distance = fingerprintDistance(mine, theirs);
      return distance <= MAX_IMAGE_DISTANCE ? { versionId, distance } : null;
    }),
  );
  return results.filter((match) => match !== null);
}
