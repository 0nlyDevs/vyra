'use server';

import { revalidatePath } from 'next/cache';
import { type ActionResult, fail, ok } from '@/lib/action-result';
import {
  CERTAINTY_CRITERIA,
  CERTAINTY_LABELS,
  type CertaintyLevel,
  EVIDENCE_STANCE_LABELS,
  EVIDENCE_STRENGTH_LABELS,
} from '@/lib/domain';
import { ERRORS } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import { getCaseFile } from '@/server/dal/cases';
import {
  concludeHearing,
  createHearing,
  getHearing,
  getLatestHearing,
  searchJudgedCasesByMeaning,
} from '@/server/dal/court';
import type { Hearing } from '@/server/db/schema';
import { demoVariantForCase } from '@/server/demo/variants';
import { embedTexts, runPrompt } from '@/server/processing';
import { getCurrentProfile } from '@/server/session';
import { computeCertainty } from './certainty';
import { embedMissingCases } from './embeddings';
import { guardPleading } from './pleading-guard';
import { courtRelevanceSchema, keepRelevantCourtCases } from './relevance';
import {
  judgedSearchSchema,
  openHearingSchema,
  pleadingSchema,
  verdictSchema,
  voteSchema,
} from './schema';
import { caseSearchText, courtSearchQueries } from './search';

// Le tribunal : deux plaidoiries (accusation, défense), le vote du juré, la conclusion du juge.
// Toujours dans cet ordre : connexion → validation Zod → droits → action via la DAL.

export type HearingView = Pick<
  Hearing,
  | 'id'
  | 'status'
  | 'prosecution'
  | 'defense'
  | 'pleadingsSource'
  | 'vote'
  | 'certainty'
  | 'findings'
  | 'conclusion'
  | 'whatToCheck'
  | 'verdictSource'
>;

function toView(hearing: Hearing): HearingView {
  return {
    id: hearing.id,
    status: hearing.status,
    prosecution: hearing.prosecution,
    defense: hearing.defense,
    pleadingsSource: hearing.pleadingsSource,
    vote: hearing.vote,
    certainty: hearing.certainty,
    findings: hearing.findings,
    conclusion: hearing.conclusion,
    whatToCheck: hearing.whatToCheck,
    verdictSource: hearing.verdictSource,
  };
}

type CaseFile = NonNullable<Awaited<ReturnType<typeof getCaseFile>>>;

// Les pièces telles que l'IA les lit : numéro, contenu, source, date, solidité.
function piecesForAi(file: CaseFile, withStance: boolean) {
  return file.evidence.map((piece) => ({
    number: piece.number,
    title: piece.title,
    content: piece.content,
    source: piece.sourceName,
    date: piece.publishedAt ? formatDate(piece.publishedAt) : 'date inconnue',
    strength: EVIDENCE_STRENGTH_LABELS[piece.strength].toLowerCase(),
    ...(withStance ? { stance: EVIDENCE_STANCE_LABELS[piece.stance].toLowerCase() } : {}),
  }));
}

export async function openHearing(caseId: string): Promise<ActionResult<HearingView>> {
  const profile = await getCurrentProfile();
  if (!profile) return fail(ERRORS.UNAUTHORIZED);
  const parsed = openHearingSchema.safeParse({ caseId });
  if (!parsed.success) return fail(ERRORS.VALIDATION_FAILED, parsed.error);

  const file = await getCaseFile(parsed.data.caseId);
  if (!file) return fail(ERRORS.NOT_FOUND);
  // Une audience existe déjà (double clic, autre onglet, affaire jugée) : on la reprend. En créer
  // une autre rouvrirait une affaire conclue et la retirerait de « déjà jugé ».
  const existing = await getLatestHearing(file.id);
  if (existing) return ok(toView(existing));

  const payload = { claim: file.claim, evidence: piecesForAi(file, false) };
  const options = { fallbackVariant: demoVariantForCase(file.id) };
  // Les deux avocats préparent leur plaidoirie en même temps.
  const [prosecution, defense] = await Promise.all([
    runPrompt('prosecution', payload, pleadingSchema, options),
    runPrompt('defense', payload, pleadingSchema, options),
  ]);
  if (!prosecution.ok) return prosecution;
  if (!defense.ok) return defense;

  const fromModel = prosecution.data.source === 'gemini' && defense.data.source === 'gemini';
  const hearing = await createHearing({
    caseId: file.id,
    profileId: profile.id,
    prosecution: guardPleading(prosecution.data.result, file.evidence, file.claim),
    defense: guardPleading(defense.data.result, file.evidence, file.claim),
    pleadingsSource: fromModel ? 'gemini' : 'fallback',
  });
  if (!hearing) return fail(ERRORS.INTERNAL);
  revalidatePath(`/court/${file.id}`);
  return ok(toView(hearing));
}

export async function voteAndJudge(
  hearingId: string,
  vote: string,
): Promise<ActionResult<HearingView>> {
  const profile = await getCurrentProfile();
  if (!profile) return fail(ERRORS.UNAUTHORIZED);
  const parsed = voteSchema.safeParse({ hearingId, vote });
  if (!parsed.success) return fail(ERRORS.VALIDATION_FAILED, parsed.error);

  const hearing = await getHearing(parsed.data.hearingId);
  if (!hearing) return fail(ERRORS.NOT_FOUND);
  if (hearing.status === 'concluded') return ok(toView(hearing));
  const file = await getCaseFile(hearing.caseId);
  if (!file) return fail(ERRORS.NOT_FOUND);

  // Le niveau vient de la règle ; le juge l'explique et classe les affirmations.
  const certainty: CertaintyLevel = computeCertainty(file.evidence);
  const payload = {
    claim: file.claim,
    certainty: {
      level: certainty,
      label: CERTAINTY_LABELS[certainty],
      criterion: CERTAINTY_CRITERIA[certainty],
    },
    evidence: piecesForAi(file, true),
    prosecution: hearing.prosecution,
    defense: hearing.defense,
  };
  const [verdict, vectors] = await Promise.all([
    runPrompt('judge', payload, verdictSchema, { fallbackVariant: demoVariantForCase(file.id) }),
    embedTexts([caseSearchText(file)]),
  ]);
  if (!verdict.ok) return verdict;

  const { confirmed, contested, missing, conclusion, whatToCheck } = verdict.data.result;
  const concluded = await concludeHearing({
    hearingId: hearing.id,
    caseId: file.id,
    vote: parsed.data.vote,
    certainty,
    findings: { confirmed, contested, missing },
    conclusion,
    whatToCheck,
    verdictSource: verdict.data.source,
    embedding: vectors.ok ? (vectors.data[0] ?? null) : null,
  });
  if (!concluded) return fail(ERRORS.INTERNAL);
  revalidatePath('/court');
  revalidatePath('/dashboard');
  revalidatePath(`/court/${file.id}`);
  return ok(toView(concluded));
}

export type JudgedMatch = {
  items: {
    id: string;
    title: string;
    certainty: CertaintyLevel | null;
    conclusion: string | null;
    reason: string;
  }[];
};

// « Déjà jugé » : cette information ressemble-t-elle à une affaire déjà conclue ?
export async function checkAlreadyJudged(
  _previous: ActionResult<JudgedMatch> | null,
  formData: FormData,
): Promise<ActionResult<JudgedMatch>> {
  const profile = await getCurrentProfile();
  if (!profile) return fail(ERRORS.UNAUTHORIZED);
  const parsed = judgedSearchSchema.safeParse({ query: formData.get('query') });
  if (!parsed.success) return fail(ERRORS.VALIDATION_FAILED, parsed.error);

  if (!(await embedMissingCases())) return fail(ERRORS.AI_UNAVAILABLE);
  const vectors = await embedTexts(courtSearchQueries(parsed.data.query));
  if (!vectors.ok) return fail(ERRORS.AI_UNAVAILABLE);
  const found = await searchJudgedCasesByMeaning(vectors.data);
  if (found.length === 0) return ok({ items: [] });
  const relevance = await runPrompt(
    'court-relevance',
    {
      query: parsed.data.query,
      candidates: found.map((item, index) => ({
        number: index + 1,
        title: item.title,
        claim: item.claim,
      })),
    },
    courtRelevanceSchema,
  );
  if (!relevance.ok || relevance.data.source === 'fallback') return fail(ERRORS.AI_UNAVAILABLE);
  const kept = keepRelevantCourtCases(relevance.data.result, found);
  if (!kept) return fail(ERRORS.AI_UNAVAILABLE);
  return ok({
    items: kept.map(({ item, reason }) => ({
      id: item.id,
      title: item.title,
      certainty: item.certainty,
      conclusion: item.conclusion,
      reason,
    })),
  });
}
