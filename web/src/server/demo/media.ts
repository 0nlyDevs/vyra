import 'server-only';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Fichiers de démo (web/public/demo) et le nom de leur réponse de secours dans processing
// (`fallbacks/<prompt>--<nom>.json`). On reconnaît un fichier à son empreinte : si l'équipe
// remplace une image de démo par une vraie photo, rien d'autre n'est à changer.
const DEMO_MEDIA: [file: string, variant: string][] = [
  ['inondation-2019.png', 'flood'],
  ['inondation-virale.jpg', 'flood'],
  ['image-generee.png', 'generated'],
  ['vocal-coupure-eau.wav', 'water-voice'],
];

let variantsBySha: Promise<Map<string, string>> | null = null;

async function loadVariants() {
  const entries = await Promise.all(
    DEMO_MEDIA.map(async ([file, variant]) => {
      try {
        const bytes = await readFile(path.join(process.cwd(), 'public', 'demo', file));
        return [createHash('sha256').update(bytes).digest('hex'), variant] as const;
      } catch {
        return null; // fichier de démo retiré : il n'a simplement plus de réponse propre
      }
    }),
  );
  return new Map(entries.filter((entry) => entry !== null));
}

export async function demoVariantForMedia(sha256: string) {
  variantsBySha ??= loadVariants();
  return (await variantsBySha).get(sha256);
}
