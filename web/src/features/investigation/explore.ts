import 'server-only';
import { type ActionResult, fail, ok } from '@/lib/action-result';
import { ERRORS } from '@/lib/errors';
import { getCaseFile } from '@/server/dal/cases';
import { addExploredVersions, listExploredVersions } from '@/server/dal/investigation';
import { embedTexts, findWebSources, type WebArticle } from '@/server/processing';
import { confirmSameInformation } from './same-information';
import { describeTree } from './tree-links';
import { significantWords, wordOverlap } from './word-match';

// Explorer une source : chercher sur le web qui l'a reprise ensuite, et ajouter ces reprises à
// l'arbre, comme une génération de plus. Une fois par source, et un arbre limité en taille.

const MAX_NEW = 4;
const MAX_CASE_VERSIONS = 16;
const MAX_DISTANCE = 0.3;
const CONTENT_MAX_LENGTH = 600;

export type ExploreResult = { added: number };

// Une seule exploration à la fois par source (double clic, deux onglets).
const running = new Map<string, Promise<ActionResult<ExploreResult>>>();

export function exploreVersion(
  caseId: string,
  versionId: string,
): Promise<ActionResult<ExploreResult>> {
  const current = running.get(versionId);
  if (current) return current;
  const task = explore(caseId, versionId).finally(() => running.delete(versionId));
  running.set(versionId, task);
  return task;
}

async function explore(caseId: string, versionId: string): Promise<ActionResult<ExploreResult>> {
  const file = await getCaseFile(caseId);
  const explored = file?.versions.find((version) => version.id === versionId);
  if (!file || !explored) return fail(ERRORS.NOT_FOUND);
  const previous = (await listExploredVersions(caseId)).find(
    (item) => item.versionId === versionId,
  );
  if (previous) return ok({ added: previous.addedCount });

  const room = Math.min(MAX_NEW, MAX_CASE_VERSIONS - file.versions.length);
  const search = await findWebSources(explored.content);
  if (!search.ok || search.data.source === 'fallback') return fail(ERRORS.WEB_SEARCH_UNAVAILABLE);

  // Les reprises : des pages absentes de l'arbre, publiées après la source explorée.
  const known = new Set(file.versions.map((version) => version.sourceUrl).filter(Boolean));
  const after = explored.publishedAt?.getTime() ?? 0;
  const fresh = search.data.articles.filter((article) => {
    const time = article.published_at ? Date.parse(article.published_at) : Number.NaN;
    return !known.has(article.url) && (Number.isNaN(time) || time > after);
  });

  const close = await keepClose(explored.content, fresh);
  const confirmations = await confirmSameInformation(explored.content, close.map(articleText));
  const judged = close
    .map((article, index) => ({ article, confirmation: confirmations?.[index] }))
    .filter(({ confirmation }) => confirmation?.relation !== 'unrelated')
    .slice(0, Math.max(0, room));

  const links = await describeTree([
    {
      key: explored.id,
      relation: 'same',
      text: explored.content,
      body: '',
      url: explored.sourceUrl,
      site: explored.sourceName,
      links: [],
      // La source explorée est la racine de cette génération.
      time: Number.MIN_SAFE_INTEGER,
    },
    ...judged.map(({ article, confirmation }, index) => ({
      key: `new-${index}`,
      relation: confirmation?.relation ?? 'same',
      text: articleText(article),
      body: article.body,
      url: article.url,
      site: article.site,
      links: article.links,
      time: article.published_at ? Date.parse(article.published_at) : null,
      reason: confirmation?.reason,
    })),
  ]);

  await addExploredVersions({
    caseId,
    exploredId: explored.id,
    versions: judged.map(({ article }, index) => ({
      key: `new-${index}`,
      content: articleText(article),
      sourceName: article.site,
      sourceUrl: article.url,
      publishedAt: article.published_at ? new Date(article.published_at) : null,
    })),
    links,
  });
  return ok({ added: judged.length });
}

// Les pages proches par le sens de la source explorée (sans IA : par mots).
async function keepClose(text: string, articles: WebArticle[]) {
  if (articles.length === 0) return [];
  const vectors = await embedTexts([text, ...articles.map(articleText)]);
  const [reference, ...others] = vectors.ok ? vectors.data : [];
  if (reference) {
    return articles.filter((_, index) => {
      const vector = others[index];
      return vector !== undefined && cosineDistance(reference, vector) <= MAX_DISTANCE;
    });
  }
  const words = significantWords(text);
  return articles.filter((article) => {
    const overlap = wordOverlap(words, significantWords(articleText(article)));
    return overlap.ratio >= 0.4 && overlap.shared >= 3;
  });
}

function articleText(article: WebArticle) {
  const text = article.excerpt ? `${article.title}. ${article.excerpt}` : article.title;
  return text.length > CONTENT_MAX_LENGTH ? `${text.slice(0, CONTENT_MAX_LENGTH)}…` : text;
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
