import { containsQuote, quotedPassages } from '@/lib/quotes';
import type { Pleading } from '@/server/db/schema';

// Garde-fou des plaidoiries : l'IA ne doit rien inventer. On vérifie, sans IA :
// - les pièces citées : seuls les numéros du dossier restent, et une « pièce n° 3 » écrite dans le
//   texte compte comme citée même si l'IA a oublié de la lister ;
// - les citations : un passage entre guillemets d'au moins quatre mots doit se trouver mot pour mot
//   dans une pièce (ou dans l'information jugée). Sinon il est signalé à l'écran.

const MIN_QUOTE_WORDS = 4;

type Piece = { number: number; title: string; content: string };

export function guardPleading(pleading: Pleading, pieces: Piece[], claim: string): Pleading {
  const numbers = new Set(pieces.map((piece) => piece.number));
  const mentioned = [...pleading.argument.matchAll(/pi[eè]ces?\s*n[°o]?\s*(\d+)/giu)].map((match) =>
    Number(match[1]),
  );
  const cited = [...new Set([...pleading.cited, ...mentioned])]
    .filter((number) => numbers.has(number))
    .sort((a, b) => a - b);

  const sources = [claim, ...pieces.map((piece) => `${piece.title}\n${piece.content}`)];
  const unverified = quotedPassages(pleading.argument).filter(
    (quote) =>
      quote.split(/\s+/).length >= MIN_QUOTE_WORDS &&
      !sources.some((source) => containsQuote(source, quote)),
  );
  return { argument: pleading.argument, cited, unverified };
}
