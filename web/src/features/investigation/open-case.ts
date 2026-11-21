import 'server-only';
import {
  createCaseWithFirstVersion,
  findClosestCaseByMeaning,
  listCasesWithoutEmbedding,
  listCaseTexts,
  setCaseEmbeddings,
} from '@/server/dal/investigation';
import { embedTexts } from '@/server/processing';
import { significantWords, wordOverlap } from './word-match';

// Ouvrir une enquête : retrouver l'affaire qui porte déjà cette information, sinon en créer une.
// Point d'entrée commun au formulaire de /cases et à la bulle dans Chrome.

// Distance cosinus maximale pour dire « même information » (0 = identique).
const MEANING_MAX_DISTANCE = 0.2;
// Part minimale des mots du texte reçu retrouvés dans une affaire, sans IA.
const WORDS_MIN_OVERLAP = 0.6;
// Et au moins quatre mots en commun : un texte court qui ne cite qu'un lieu ne suffit pas.
const WORDS_MIN_SHARED = 4;
const TITLE_MAX_LENGTH = 70;

export type OpenCaseOutcome = {
  caseId: string;
  // `null` : aucune affaire proche, une nouvelle a été créée.
  matchedBy: 'meaning' | 'words' | null;
};

export async function openCaseFromClaim(input: {
  claim: string;
  sourceUrl: string | null;
  sourceName?: string;
}): Promise<OpenCaseOutcome> {
  // On calcule en une fois le vecteur du texte reçu et ceux des affaires qui n'en ont pas encore.
  const missing = await listCasesWithoutEmbedding();
  const vectors = await embedTexts([
    input.claim,
    ...missing.map((item) => `${item.title}\n${item.claim}`),
  ]);
  const claimEmbedding = vectors.ok ? (vectors.data[0] ?? null) : null;

  if (vectors.ok && claimEmbedding) {
    await setCaseEmbeddings(
      missing.flatMap((item, index) => {
        const embedding = vectors.data[index + 1];
        return embedding ? [{ id: item.id, embedding }] : [];
      }),
    );
    const closest = await findClosestCaseByMeaning(claimEmbedding);
    if (closest && closest.distance <= MEANING_MAX_DISTANCE) {
      return { caseId: closest.id, matchedBy: 'meaning' };
    }
  } else {
    const byWords = await findClosestCaseByWords(input.claim);
    if (byWords) return { caseId: byWords, matchedBy: 'words' };
  }

  const created = await createCaseWithFirstVersion({
    title: titleFrom(input.claim),
    claim: input.claim,
    embedding: claimEmbedding,
    sourceName: input.sourceName ?? sourceNameFrom(input.sourceUrl),
    sourceUrl: input.sourceUrl,
  });
  return { caseId: created.id, matchedBy: null };
}

async function findClosestCaseByWords(claim: string) {
  const words = significantWords(claim);
  let best: { id: string; shared: number; ratio: number } | null = null;
  for (const item of await listCaseTexts()) {
    const overlap = wordOverlap(words, significantWords(item.texts.join(' ')));
    if (!best || overlap.ratio > best.ratio) best = { id: item.id, ...overlap };
  }
  return best && best.ratio >= WORDS_MIN_OVERLAP && best.shared >= WORDS_MIN_SHARED
    ? best.id
    : null;
}

function titleFrom(claim: string) {
  const oneLine = claim.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= TITLE_MAX_LENGTH) return oneLine;
  const cut = oneLine.slice(0, TITLE_MAX_LENGTH);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 30 ? lastSpace : TITLE_MAX_LENGTH).trimEnd()}…`;
}

function sourceNameFrom(sourceUrl: string | null) {
  if (!sourceUrl) return 'Texte collé dans la plateforme';
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, '');
  } catch {
    return 'Lien fourni';
  }
}
