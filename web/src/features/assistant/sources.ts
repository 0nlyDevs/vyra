// Les sources extérieures que l'assistant peut lire : articles web, Wikipédia et vérifications
// déjà publiées par des vérificateurs. Ce sont de la DONNÉE : elles donnent du contexte, jamais une
// conclusion de Vyra. Les liens affichés viennent d'ici (des résultats de processing), jamais de ce
// que dit le modèle, et seuls des liens https sont gardés.

const MAX_ITEMS = 4;
const MAX_TEXT = 600;

type Wikipedia = { url: string; title: string; language: string; summary: string };
type FactCheck = {
  url: string;
  title: string;
  publisher: string;
  rating: string | null;
  excerpt: string;
  published_at?: string | null;
};
type WebSource = {
  url: string;
  title: string;
  site: string;
  excerpt: string;
  body?: string;
  published_at: string | null;
};

export type External = {
  number: number;
  kind: 'wikipedia' | 'verification' | 'web';
  title: string;
  text: string;
  // Où lire : Wikipédia, ou le nom du vérificateur.
  label: string;
  url: string;
  // Seulement pour une vérification : la conclusion du vérificateur, telle qu'il l'a écrite.
  rating: string | null;
  publishedAt: string | null;
};

export type Reference = {
  number: number;
  title: string;
  href: string;
  label: string;
  publishedAt: string | null;
};

function safeUrl(raw: string, hostEndsWith?: string) {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return null;
    if (hostEndsWith && !url.hostname.endsWith(hostEndsWith)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

const clip = (text: string) => text.replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT);
const date = (value: string | null | undefined) =>
  value && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;

// Mélange les trois catégories : les nombreux résultats d'un moteur ne doivent pas masquer les autres.
export function buildExternal(
  wikipedia: readonly Wikipedia[],
  checks: readonly FactCheck[],
  web: readonly WebSource[] = [],
) {
  const items: External[] = [];
  const articles: External[] = [];
  const encyclopedic: External[] = [];
  for (const check of checks) {
    const url = safeUrl(check.url);
    if (url) {
      items.push({
        number: 0,
        kind: 'verification',
        title: check.title,
        text: clip(check.excerpt || check.title),
        label: check.publisher,
        url,
        rating: check.rating,
        publishedAt: date(check.published_at),
      });
    }
  }
  for (const article of web) {
    const url = safeUrl(article.url);
    if (!url) continue;
    articles.push({
      number: 0,
      kind: 'web',
      title: clip(article.title || article.site),
      text: clip(article.excerpt || article.body || article.title),
      label: clip(article.site || new URL(url).hostname),
      url,
      rating: null,
      publishedAt: date(article.published_at),
    });
  }
  for (const article of wikipedia) {
    const url = safeUrl(article.url, '.wikipedia.org');
    if (url) {
      encyclopedic.push({
        number: 0,
        kind: 'wikipedia',
        title: article.title,
        text: clip(article.summary),
        label: 'Wikipédia',
        url,
        rating: null,
        publishedAt: null,
      });
    }
  }
  const groups = [items, articles, encyclopedic];
  const mixed = Array.from({ length: MAX_ITEMS }, (_, index) =>
    groups.flatMap((group) => (group[index] ? [group[index]] : [])),
  ).flat();
  const seen = new Set<string>();
  const unique = mixed.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
  return unique.slice(0, MAX_ITEMS).map((item, index) => ({ ...item, number: index + 1 }));
}

// Ce que le modèle voit : le texte, sans l'adresse.
export function externalForModel(items: readonly External[]) {
  return items.map(({ number, kind, title, text, label, rating, publishedAt }) => ({
    number,
    kind,
    title,
    text,
    label,
    rating,
    publishedAt,
  }));
}

// Les liens des sources que le modèle a citées, construits ici.
export function buildReferences(cited: readonly number[], items: readonly External[]): Reference[] {
  const unique = [...new Set(cited)];
  return unique.flatMap((number) => {
    const item = items.find((entry) => entry.number === number);
    return item
      ? [
          {
            number,
            title: item.title,
            href: item.url,
            label: item.label,
            publishedAt: item.publishedAt,
          },
        ]
      : [];
  });
}
