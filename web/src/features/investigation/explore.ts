import 'server-only';
import { type ActionResult, fail, ok } from '@/lib/action-result';
import { ERRORS } from '@/lib/errors';
import { getCaseFile } from '@/server/dal/cases';
import { addExploredVersions, listExploredVersions } from '@/server/dal/investigation';
import { embedTexts, findWebSources, readPages, type WebArticle } from '@/server/processing';
import { isSideLink } from './graph-layout';
import { confirmSameInformation } from './same-information';
import { describeTree } from './tree-links';
import { significantWords, wordOverlap } from './word-match';

// Explorer une source, dans les deux sens :
// - en amont : on lit sa page et on suit ses liens vers d'autres articles (ses sources) ;
// - en aval : on cherche sur le web qui l'a reprise ensuite.
// Les pages qui rapportent la même information (ou la démentent) s'ajoutent à l'arbre ; chacune
// peut être explorée à son tour : l'arbre gagne autant de générations qu'on veut.

// Pages examinées par exploration : les quotas gratuits de l'IA ne suivent pas au-delà.
const MAX_CANDIDATES = 40;
// Liens suivis dans la page explorée (les autres sont des menus, des réseaux, des publicités).
const MAX_FOLLOWED_LINKS = 15;
const MAX_DISTANCE = 0.38;
const EMBED_BATCH = 50;
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

  const known = new Set(file.versions.map((version) => version.sourceUrl).filter(Boolean));

  // En amont et en aval en même temps : la page explorée (pour ses liens), et le web.
  const [ownPage, search] = await Promise.all([
    explored.sourceUrl ? readPages([explored.sourceUrl]) : Promise.resolve(null),
    findWebSources(explored.content),
  ]);
  const page = ownPage?.ok ? ownPage.data[0] : undefined;
  const followed = articleLinks(page?.links ?? [], explored.sourceUrl, known);
  const linked = followed.length > 0 ? await readPages(followed) : null;
  const searchReached = search.ok && search.data.source !== 'fallback';
  if (!searchReached && !linked?.ok) return fail(ERRORS.WEB_SEARCH_UNAVAILABLE);

  // En aval, seulement ce qui est publié après la source ; en amont, tout ce qu'elle cite.
  const after = explored.publishedAt?.getTime() ?? 0;
  const downstream = (searchReached ? search.data.articles : []).filter((article) => {
    const time = article.published_at ? Date.parse(article.published_at) : Number.NaN;
    return Number.isNaN(time) || time > after;
  });
  const candidates = [
    ...new Map(
      [...(linked?.ok ? linked.data : []), ...downstream]
        .filter((article) => !known.has(article.url))
        .map((article) => [article.url, article]),
    ).values(),
  ].slice(0, MAX_CANDIDATES);

  // Par le sens si l'IA donne les vecteurs ; sinon tous les candidats vont à l'IA qui juge, et le
  // tri par mots ne sert qu'en dernier recours (ni vecteurs ni IA).
  const close = (await keepClose(explored.content, candidates)) ?? candidates;
  const confirmations = await confirmSameInformation(explored.content, close.map(articleText));
  const judged = (confirmations ? close : keepByWords(explored.content, close))
    .map((article, index) => ({ article, confirmation: confirmations?.[index] }))
    .filter(({ confirmation }) => confirmation?.relation !== 'unrelated');

  const links = await describeTree(
    [
      {
        key: explored.id,
        relation: 'same',
        text: explored.content,
        body: page?.body ?? '',
        url: explored.sourceUrl,
        site: explored.sourceName,
        links: page?.links ?? [],
        time: explored.publishedAt?.getTime() ?? null,
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
    ],
    // Sans indice, une page trouvée se rattache à la source explorée.
    explored.id,
  );

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

// Les liens d'une page qui mènent à d'autres articles : sur un autre site, avec un chemin d'article,
// hors réseaux de partage, images et pages de service. Déjà dans l'arbre : ignorés.
const NOT_ARTICLES =
  /\.(jpg|jpeg|png|gif|webp|svg|pdf|mp4|mp3)(\?|$)|\/(tag|tags|category|categorie|auteur|author|login|signin|share|sharer|intent|search|recherche|abonnement|subscribe|newsletter|privacy|cookies|cgu|mentions)\b/i;
const SHARE_HOSTS =
  /(^|\.)(facebook|twitter|x|linkedin|whatsapp|pinterest|t|telegram|google|apple)\.(com|me|org)$/;

function articleLinks(links: string[], pageUrl: string | null, known: Set<string | null>) {
  let pageHost = '';
  try {
    pageHost = pageUrl ? new URL(pageUrl).hostname.replace(/^www\./, '') : '';
  } catch {
    pageHost = '';
  }
  const kept: string[] = [];
  for (const link of links) {
    let url: URL;
    try {
      url = new URL(link);
    } catch {
      continue;
    }
    const host = url.hostname.replace(/^www\./, '');
    const isArticle = url.pathname.length > 12 && !NOT_ARTICLES.test(link);
    if (host === pageHost || SHARE_HOSTS.test(host) || !isArticle || known.has(link)) continue;
    if (!kept.includes(link)) kept.push(link);
    if (kept.length >= MAX_FOLLOWED_LINKS) break;
  }
  return kept;
}

// Les pages proches par le sens de la source explorée ; `null` si les vecteurs sont indisponibles.
async function keepClose(text: string, articles: WebArticle[]): Promise<WebArticle[] | null> {
  if (articles.length === 0) return [];
  const vectors: number[][] = [];
  const texts = [text, ...articles.map(articleText)];
  for (let start = 0; start < texts.length; start += EMBED_BATCH) {
    const batch = await embedTexts(texts.slice(start, start + EMBED_BATCH));
    if (!batch.ok) {
      vectors.length = 0;
      break;
    }
    vectors.push(...batch.data);
  }
  const [reference, ...others] = vectors;
  if (reference) {
    return articles.filter((_, index) => {
      const vector = others[index];
      return vector !== undefined && cosineDistance(reference, vector) <= MAX_DISTANCE;
    });
  }
  return null;
}

// Dernier recours, sans aucune IA : les pages qui reprennent assez de mots de la source.
function keepByWords(text: string, articles: WebArticle[]) {
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

// Explorations menées en même temps : assez pour aller vite, pas trop pour les quotas gratuits.
const LEVEL_CONCURRENCY = 3;

// Les sources en bout de branche, pas encore explorées : la prochaine génération à chercher.
export async function frontierOf(caseId: string) {
  const file = await getCaseFile(caseId);
  if (!file) return [];
  const explored = new Set((await listExploredVersions(caseId)).map((item) => item.versionId));
  const parents = new Set(
    file.links.filter((link) => !isSideLink(link)).map((link) => link.fromVersionId),
  );
  return file.versions
    .filter((version) => version.sourceUrl && !explored.has(version.id) && !parents.has(version.id))
    .map((version) => version.id);
}

// « Explorer un niveau de plus » : chaque source en bout de branche est explorée ; l'arbre gagne
// une génération partout à la fois.
export async function exploreLevel(
  caseId: string,
): Promise<ActionResult<{ explored: number; added: number }>> {
  const queue = await frontierOf(caseId);
  if (queue.length === 0) return ok({ explored: 0, added: 0 });
  let added = 0;
  let failures = 0;
  const worker = async () => {
    for (let id = queue.shift(); id; id = queue.shift()) {
      const result = await exploreVersion(caseId, id);
      if (result.ok) added += result.data.added;
      else failures += 1;
    }
  };
  const total = queue.length;
  await Promise.all(Array.from({ length: Math.min(LEVEL_CONCURRENCY, total) }, worker));
  if (failures === total) return fail(ERRORS.WEB_SEARCH_UNAVAILABLE);
  return ok({ explored: total - failures, added });
}
