import 'server-only';
import { z } from 'zod';
import { type ActionResult, fail, ok } from '@/lib/action-result';
import {
  CHANGE_TYPES,
  type InfoRelation,
  LINK_CONFIDENCES,
  type WebSearchStatus,
} from '@/lib/domain';
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
import { refreshNewsIndex, searchNewsIndex } from './news-index';
import { confirmSameInformation } from './same-information';
import { significantWords, wordOverlap } from './word-match';

// Recherche web d'une affaire : les articles de presse qui rapportent la même information
// deviennent des versions du graphe, rangées par date et reliées entre elles.

// Distance cosinus maximale entre l'information et un article (titre et extrait).
const WEB_MAX_DISTANCE = 0.3;
// Sans IA : part et nombre minimal de mots de l'information retrouvés dans l'article.
const WEB_MIN_OVERLAP = 0.4;
const WEB_MIN_SHARED = 3;
// Sources autour du centre de la toile : au-delà, elle devient illisible au projecteur.
const MAX_KEPT = 8;
const CONTENT_MAX_LENGTH = 600;

export type WebSearchResult = {
  status: WebSearchStatus | 'prepared';
  kept: number;
  // Sources qui démentent l'information, selon l'IA : de futures pièces pour le tribunal.
  contradicting: number;
};

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
  if (previous) {
    return ok({
      status: previous.status,
      kept: previous.keptCount,
      contradicting: previous.contradictingCount,
    });
  }
  // Une affaire qui a déjà plusieurs versions a été préparée à la main (données de démo).
  const received = file.versions[0];
  if (file.versions.length !== 1 || !received) {
    return ok({ status: 'prepared', kept: 0, contradicting: 0 });
  }

  // Le web (Tavily) et la mise à jour de l'index de presse en même temps.
  const [search] = await Promise.all([findWebSources(file.claim), refreshNewsIndex()]);
  const webReached = search.ok && search.data.source !== 'fallback';
  const found = webReached ? search.data.articles : [];

  const vectors = await embedTexts([file.claim, ...found.map(articleText)]);
  const claimVector = vectors.ok ? (vectors.data[0] ?? null) : null;
  const fromWeb = keepSameInformation(file.claim, found, vectors.ok ? vectors.data.slice(1) : null);
  const fromIndex = await searchNewsIndex(file.claim, claimVector);
  // Ni web ni index : on n'enregistre rien, la personne peut relancer.
  if (!webReached && fromIndex.length === 0) return fail(ERRORS.WEB_SEARCH_UNAVAILABLE);

  // À adresse égale, l'article de l'index l'emporte : il porte le nom du journal.
  const unique = [...new Map([...fromWeb, ...fromIndex].map((item) => [item.url, item])).values()];
  // L'IA dit ce que chaque source proche par le sens rapporte par rapport à l'information : le même
  // fait, un démenti, ou le même sujet (contexte). Toutes vont dans la toile, sauf les sources sans
  // rapport. Sans IA : les vecteurs suffisent, toutes sont prises pour le même fait.
  const confirmations = await confirmSameInformation(file.claim, unique.map(articleText));
  const judged = unique.flatMap((article, index) => {
    const confirmation = confirmations?.[index];
    if (confirmation?.relation === 'unrelated') return [];
    return [{ article, relation: confirmation?.relation ?? 'same', reason: confirmation?.reason }];
  });
  const contradicting = judged.filter((item) => item.relation === 'contradicts').length;
  const kept = judged
    .sort((a, b) => dateValue(a.article.published_at) - dateValue(b.article.published_at))
    .slice(0, MAX_KEPT);

  // Les sources du plus ancien au plus récent, puis le texte reçu, au centre de la toile.
  const ordered: OrderedVersion[] = [
    ...kept.map(({ article }) => ({
      content: articleText(article),
      sourceName: article.site,
      sourceUrl: article.url,
      publishedAt: article.published_at ? new Date(article.published_at) : null,
    })),
    { id: received.id },
  ];
  const links = await linkToReceived(kept, received.content);

  const status = kept.length > 0 ? 'found' : 'nothing_found';
  await saveWebSearch({
    caseId,
    status,
    foundCount: found.length + fromIndex.length,
    contradictingCount: contradicting,
    ordered,
    links,
  });
  return ok({ status, kept: kept.length, contradicting });
}

// Garde les articles qui disent la même chose : par le sens si l'IA a donné les vecteurs
// (le premier est celui de l'information), sinon par mots.
function keepSameInformation(
  claim: string,
  articles: WebArticle[],
  vectors: number[][] | null,
): WebArticle[] {
  const [claimVector, ...articleVectors] = vectors ?? [];
  if (claimVector) {
    return articles.filter((_, index) => {
      const vector = articleVectors[index];
      return vector !== undefined && cosineDistance(claimVector, vector) <= WEB_MAX_DISTANCE;
    });
  }
  const claimWords = significantWords(claim);
  return articles.filter((article) => {
    const overlap = wordOverlap(claimWords, significantWords(articleText(article)));
    return overlap.ratio >= WEB_MIN_OVERLAP && overlap.shared >= WEB_MIN_SHARED;
  });
}

// Un lien entre chaque source et le texte reçu (le dernier de `ordered`) : un démenti ou un même
// sujet garde la phrase de l'IA ; une version du même fait dit ce qui a changé, selon l'IA ou à
// défaut estimé d'après les mots.
async function linkToReceived(
  kept: { article: WebArticle; relation: InfoRelation; reason: string | undefined }[],
  received: string,
): Promise<LinkBetween[]> {
  const center = kept.length;
  const versions = kept.flatMap((item, index) => (item.relation === 'same' ? [index] : []));
  const pairs = versions.map((index) => ({
    before: articleText(kept[index]?.article ?? emptyArticle),
    after: received,
  }));
  const described =
    pairs.length > 0 ? await runPrompt('compare-versions', { pairs }, compareSchema) : null;
  const fromAi =
    described?.ok && described.data.result.links.length === pairs.length
      ? described.data.result.links
      : null;

  return kept.map((item, index) => {
    if (item.relation !== 'same') {
      return {
        from: index,
        to: center,
        changeType: item.relation === 'contradicts' ? 'contradicts' : 'related',
        note: item.reason ?? 'Selon l’IA.',
        confidence: 'medium',
      };
    }
    const pairIndex = versions.indexOf(index);
    const pair = pairs[pairIndex];
    return {
      from: index,
      to: center,
      ...(fromAi?.[pairIndex] ?? guessChange(pair?.before ?? '', received)),
    };
  });
}

const emptyArticle: WebArticle = {
  url: '',
  title: '',
  site: '',
  published_at: null,
  excerpt: '',
  language: null,
};

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
