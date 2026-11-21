import 'server-only';
import { z } from 'zod';
import { type ActionResult, fail, ok } from '@/lib/action-result';
import { CHANGE_TYPES, LINK_CONFIDENCES, type WebSearchStatus } from '@/lib/domain';
import { ERRORS } from '@/lib/errors';
import { getCaseFile } from '@/server/dal/cases';
import {
  getWebSearch,
  type LinkBetween,
  type OrderedVersion,
  saveWebSearch,
} from '@/server/dal/investigation';
import { embedTexts, findWebSources, runPrompt, type WebArticle } from '@/server/processing';
import { guessChange } from './guess-change';
import { significantWords, wordOverlap } from './word-match';

// Recherche web d'une affaire : les articles de presse qui rapportent la même information
// deviennent des versions du graphe, rangées par date et reliées entre elles.

// Distance cosinus maximale entre l'information et un article (titre et extrait).
const WEB_MAX_DISTANCE = 0.3;
// Sans IA : part et nombre minimal de mots de l'information retrouvés dans l'article.
const WEB_MIN_OVERLAP = 0.4;
const WEB_MIN_SHARED = 3;
const MAX_KEPT = 6;
const CONTENT_MAX_LENGTH = 600;

export type WebSearchResult = { status: WebSearchStatus | 'prepared'; kept: number };

const compareSchema = z.object({
  links: z.array(
    z.object({
      changeType: z.enum(CHANGE_TYPES),
      note: z.string().min(1),
      confidence: z.enum(LINK_CONFIDENCES),
    }),
  ),
});

export async function searchWebVersions(caseId: string): Promise<ActionResult<WebSearchResult>> {
  const file = await getCaseFile(caseId);
  if (!file) return fail(ERRORS.NOT_FOUND);

  const previous = await getWebSearch(caseId);
  if (previous) return ok({ status: previous.status, kept: previous.keptCount });
  // Une affaire qui a déjà plusieurs versions a été préparée à la main (données de démo).
  const received = file.versions[0];
  if (file.versions.length !== 1 || !received) return ok({ status: 'prepared', kept: 0 });

  const search = await findWebSources(file.claim);
  if (!search.ok || search.data.source === 'fallback') return fail(ERRORS.WEB_SEARCH_UNAVAILABLE);
  const found = search.data.articles;

  const kept = (await keepSameInformation(file.claim, found))
    .sort((a, b) => dateValue(a.published_at) - dateValue(b.published_at))
    .slice(0, MAX_KEPT);

  // Les articles du plus ancien au plus récent, puis le texte reçu (la version la plus récente).
  const ordered: OrderedVersion[] = [
    ...kept.map((article) => ({
      content: articleText(article),
      sourceName: article.site,
      sourceUrl: article.url,
      publishedAt: article.published_at ? new Date(article.published_at) : null,
    })),
    { id: received.id },
  ];
  const texts = [...kept.map(articleText), received.content];
  const links = await describeLinks(texts);

  await saveWebSearch({
    caseId,
    status: kept.length > 0 ? 'found' : 'nothing_found',
    foundCount: found.length,
    ordered,
    links,
  });
  return ok({ status: kept.length > 0 ? 'found' : 'nothing_found', kept: kept.length });
}

// Garde les articles qui disent la même chose : par le sens si l'IA répond, sinon par mots.
async function keepSameInformation(claim: string, articles: WebArticle[]) {
  if (articles.length === 0) return [];
  const vectors = await embedTexts([claim, ...articles.map(articleText)]);
  const claimVector = vectors.ok ? vectors.data[0] : undefined;
  if (vectors.ok && claimVector) {
    return articles.filter((_, index) => {
      const vector = vectors.data[index + 1];
      return vector !== undefined && cosineDistance(claimVector, vector) <= WEB_MAX_DISTANCE;
    });
  }
  const claimWords = significantWords(claim);
  return articles.filter((article) => {
    const overlap = wordOverlap(claimWords, significantWords(articleText(article)));
    return overlap.ratio >= WEB_MIN_OVERLAP && overlap.shared >= WEB_MIN_SHARED;
  });
}

// Un lien entre chaque version et la suivante : ce qui a changé, selon l'IA ou à défaut estimé.
async function describeLinks(texts: string[]): Promise<LinkBetween[]> {
  const pairs = texts.slice(1).map((after, index) => ({ before: texts[index] ?? '', after }));
  if (pairs.length === 0) return [];
  const described = await runPrompt('compare-versions', { pairs }, compareSchema);
  const fromAi =
    described.ok && described.data.result.links.length === pairs.length
      ? described.data.result.links
      : null;
  return pairs.map((pair, index) => ({
    from: index,
    to: index + 1,
    ...(fromAi?.[index] ?? guessChange(pair.before, pair.after)),
  }));
}

function articleText(article: WebArticle) {
  const text = article.excerpt ? `${article.title}. ${article.excerpt}` : article.title;
  return text.length > CONTENT_MAX_LENGTH ? `${text.slice(0, CONTENT_MAX_LENGTH)}…` : text;
}

// Sans date, l'article passe après ceux qui en ont une.
function dateValue(iso: string | null) {
  const time = iso ? Date.parse(iso) : Number.NaN;
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
}

function cosineDistance(a: number[], b: number[]) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < a.length; index += 1) {
    const x = a[index] ?? 0;
    const y = b[index] ?? 0;
    dot += x * y;
    normA += x * x;
    normB += y * y;
  }
  return normA && normB ? 1 - dot / Math.sqrt(normA * normB) : 1;
}
