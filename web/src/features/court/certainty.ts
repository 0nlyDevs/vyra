import type { CertaintyLevel, EvidenceStance, EvidenceStrength } from '@/lib/domain';

// Le niveau de certitude se calcule par une règle fixe à partir des pièces du dossier. L'IA du
// juge l'explique, elle ne le choisit pas : aucune conclusion sans pièces solides.
// Seules les pièces solides décident ; une pièce fragile ou de contexte n'est qu'un indice.

type Piece = { stance: EvidenceStance; strength: EvidenceStrength; sourceName: string };

export function computeCertainty(pieces: Piece[]): CertaintyLevel {
  const solid = pieces.filter((piece) => piece.strength === 'solid');
  const supports = solid.filter((piece) => piece.stance === 'supports');
  const contradicts = solid.filter((piece) => piece.stance === 'contradicts');

  if (supports.length > 0 && contradicts.length > 0) return 'uncertain';
  if (contradicts.length > 0) return 'contradicted';
  if (supports.length === 0) return 'insufficient';

  // « Établi » : deux sources différentes concordent, et aucune pièce, même fragile, ne contredit.
  const independentSources = new Set(supports.map((piece) => piece.sourceName)).size;
  const anyContradiction = pieces.some((piece) => piece.stance === 'contradicts');
  return independentSources >= 2 && !anyContradiction ? 'established' : 'probable';
}
