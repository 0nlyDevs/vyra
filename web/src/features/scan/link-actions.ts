'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { openCaseFromClaim } from '@/features/investigation/open-case';
import { type ActionResult, fail, ok } from '@/lib/action-result';
import { ERRORS } from '@/lib/errors';
import { containsQuote } from '@/lib/quotes';
import {
  type AiSource,
  type FactCheck,
  findFactChecks,
  readPages,
  runPrompt,
} from '@/server/processing';
import { getCurrentProfile } from '@/server/session';
import { linkClaimsSchema, linkInputSchema, openCaseFromLinkSchema } from './schema';

// Analyse d'un lien : on lit la page, on relève ses affirmations (gardées seulement si elles sont
// écrites telles quelles dans la page), son âge, et ce qu'en disent déjà les vérificateurs.
// Jamais de verdict : c'est l'enquête, puis le tribunal, qui concluent.

// Assez de texte pour y trouver une affirmation ; en dessous, on demande de coller le texte.
const MIN_TEXT = 40;
const TEXT_FOR_AI = 6000;
const DAY_MS = 86_400_000;

export type LinkView = {
  url: string;
  site: string;
  title: string;
  publishedAt: string | null;
  daysOld: number | null;
  text: string;
  claims: string[];
  mainClaim: string;
  // La page ne se lit pas (réseau social, site protégé) : il faut coller le texte de la publication.
  needsText: boolean;
  aiSource: AiSource;
  factChecks: FactCheck[];
  searched: boolean;
};

function siteOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function firstSentence(text: string) {
  const sentence = text.split(/(?<=[.!?])\s+/)[0] ?? '';
  return sentence.slice(0, 300);
}

export async function analyzeLink(input: {
  url: string;
  text?: string;
}): Promise<ActionResult<LinkView>> {
  const profile = await getCurrentProfile();
  if (!profile) return fail(ERRORS.UNAUTHORIZED);
  const parsed = linkInputSchema.safeParse(input);
  if (!parsed.success) return fail(ERRORS.VALIDATION_FAILED, parsed.error);
  const { url, text: pasted } = parsed.data;

  const pages = await readPages([url]);
  const page = pages.ok ? pages.data[0] : undefined;
  const text = (pasted || page?.body || page?.excerpt || '').trim();
  const publishedAt = page?.published_at ?? null;
  const daysOld = publishedAt
    ? Math.max(0, Math.floor((Date.now() - new Date(publishedAt).getTime()) / DAY_MS))
    : null;
  const base = {
    url,
    site: page?.site || siteOf(url),
    title: page?.title ?? '',
    publishedAt,
    daysOld: Number.isNaN(daysOld) ? null : daysOld,
    text: text.slice(0, 5000),
  };
  if (text.length < MIN_TEXT) {
    return ok({
      ...base,
      claims: [],
      mainClaim: '',
      needsText: true,
      aiSource: 'fallback',
      factChecks: [],
      searched: false,
    });
  }

  const reading = await runPrompt(
    'link-claims',
    {
      url,
      title: base.title,
      text: text.slice(0, TEXT_FOR_AI),
      today: new Date().toISOString().slice(0, 10),
      publishedAt: publishedAt?.slice(0, 10) ?? null,
    },
    linkClaimsSchema,
  );
  const found = reading.ok ? reading.data.result : { claims: [], mainClaim: '' };
  // Une affirmation qui n'est pas écrite telle quelle dans la page est écartée.
  const claims = [...new Set(found.claims.map((claim) => claim.trim()))]
    .filter((claim) => claim.length >= 10 && containsQuote(text, claim))
    .slice(0, 4);
  const mainClaim = found.mainClaim.trim() || claims[0] || base.title || firstSentence(text);

  const checks = mainClaim.length >= 10 ? await findFactChecks(mainClaim) : null;
  return ok({
    ...base,
    claims,
    mainClaim,
    needsText: false,
    aiSource: reading.ok ? reading.data.source : 'fallback',
    factChecks: checks?.ok ? checks.data.fact_checks.slice(0, 4) : [],
    searched: checks?.ok ? checks.data.searched : false,
  });
}

// Ouvre (ou retrouve) l'affaire de l'affirmation principale du lien, puis emmène sur son enquête.
export async function openCaseFromLink(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');
  const parsed = openCaseFromLinkSchema.safeParse({
    claim: formData.get('claim'),
    url: formData.get('url'),
  });
  if (!parsed.success) return;

  const outcome = await openCaseFromClaim({
    claim: parsed.data.claim,
    sourceUrl: parsed.data.url,
    sourceName: siteOf(parsed.data.url),
  });
  revalidatePath('/cases');
  const query = new URLSearchParams(
    outcome.matchedBy
      ? { matched: outcome.matchedBy, ...(outcome.reason ? { reason: outcome.reason } : {}) }
      : { new: '1' },
  );
  redirect(`/cases/${outcome.caseId}?${query.toString()}`);
}
