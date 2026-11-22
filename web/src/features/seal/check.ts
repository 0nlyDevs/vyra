import 'server-only';
import { env } from '@/lib/env';
import { getConcludedCase, listConcludedCases } from '@/server/dal/court';
import { type SealedContent, sealCode, signConclusion, verifyConclusion } from '@/server/seal';

// Ce qu'on vérifie et ce qu'on montre : l'affaire jugée telle qu'elle est en base.
type Judged = { id: string; claim: string; certainty: string | null; conclusion: string | null };

function sealable(found: Judged | null): SealedContent | null {
  if (!found?.certainty || !found.conclusion) return null;
  return {
    id: found.id,
    claim: found.claim,
    certainty: found.certainty as SealedContent['certainty'],
    conclusion: found.conclusion,
  };
}

export type Seal = { code: string; url: string };

// Le sceau actuel d'une affaire conclue, ou null (pas conclue, ou pas de clé configurée).
export async function sealForCase(id: string): Promise<Seal | null> {
  const content = sealable(await getConcludedCase(id));
  if (!content) return null;
  const signature = signConclusion(content);
  if (!signature) return null;
  const url = new URL('/verifier/sceau', env.APP_URL);
  url.searchParams.set('c', content.id);
  url.searchParams.set('s', signature);
  return { code: sealCode(signature), url: url.toString() };
}

export type SealCheck =
  | { status: 'genuine'; content: SealedContent; code: string }
  // L'affaire existe, mais la carte ne correspond pas à sa conclusion signée.
  | { status: 'mismatch'; content: SealedContent; code: string | null }
  | { status: 'unknown' };

// Un QR scanné : la signature doit correspondre au texte exact de la conclusion en base.
export async function checkSignature(id: string, signature: string): Promise<SealCheck> {
  const content = sealable(await getConcludedCase(id));
  if (!content) return { status: 'unknown' };
  const current = signConclusion(content);
  if (verifyConclusion(content, signature) && current) {
    return { status: 'genuine', content, code: sealCode(current) };
  }
  return { status: 'mismatch', content, code: current ? sealCode(current) : null };
}

// Un code tapé à la main : on cherche l'affaire conclue dont le sceau actuel donne ce code.
export async function checkCode(code: string): Promise<SealCheck> {
  for (const found of await listConcludedCases()) {
    const content = sealable(found);
    const signature = content && signConclusion(content);
    if (content && signature && sealCode(signature) === code) {
      return { status: 'genuine', content, code };
    }
  }
  return { status: 'unknown' };
}
