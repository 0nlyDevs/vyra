'use server';

import { type ActionResult, fail, ok } from '@/lib/action-result';
import { EVIDENCE_STRENGTH_LABELS } from '@/lib/domain';
import { ERRORS } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import { getCaseFile } from '@/server/dal/cases';
import { demoVariantForCase } from '@/server/demo/variants';
import { type AiSource, runPrompt } from '@/server/processing';
import { getCurrentProfile } from '@/server/session';
import { type WhatIfId, whatIfInputSchema, whatIfResultSchema } from './schema';

export type WhatIfView = {
  kind: 'real' | 'fictional';
  versions: { id: WhatIfId; label: string; text: string; changes: string[] }[];
  takeaway: string;
  source: AiSource;
};

// Pour un contenu réel : seulement la version calme. Une version alarmiste ou trompeuse d'une vraie
// publication pourrait circuler hors contexte : on ne la montre jamais, même si le modèle en écrit.
const ALLOWED: Record<'real' | 'fictional', WhatIfId[]> = {
  real: ['calm'],
  fictional: ['faithful', 'alarmist', 'misleading'],
};

export async function generateWhatIf(caseId: string): Promise<ActionResult<WhatIfView>> {
  const profile = await getCurrentProfile();
  if (!profile) return fail(ERRORS.UNAUTHORIZED);
  const parsed = whatIfInputSchema.safeParse({ caseId });
  if (!parsed.success) return fail(ERRORS.VALIDATION_FAILED, parsed.error);

  const file = await getCaseFile(parsed.data.caseId);
  if (!file) return fail(ERRORS.NOT_FOUND);

  const payload = {
    claim: file.claim,
    kind: file.kind,
    evidence: file.evidence.map((piece) => ({
      number: piece.number,
      title: piece.title,
      content: piece.content,
      source: piece.sourceName,
      date: piece.publishedAt ? formatDate(piece.publishedAt) : 'date inconnue',
      strength: EVIDENCE_STRENGTH_LABELS[piece.strength].toLowerCase(),
    })),
  };
  const result = await runPrompt('what-if', payload, whatIfResultSchema, {
    fallbackVariant: demoVariantForCase(file.id),
  });
  if (!result.ok) return result;

  const allowed = ALLOWED[file.kind];
  const versions = result.data.result.versions
    .filter((version) => allowed.includes(version.id))
    .sort((a, b) => allowed.indexOf(a.id) - allowed.indexOf(b.id));
  if (versions.length === 0) return fail(ERRORS.AI_UNAVAILABLE);

  return ok({
    kind: file.kind,
    versions,
    takeaway: result.data.result.takeaway,
    source: result.data.source,
  });
}
