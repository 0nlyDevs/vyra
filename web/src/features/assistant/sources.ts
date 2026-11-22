// Les sources extérieures que l'assistant peut lire : des articles de Wikipédia et des vérifications
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
};

export type External = {
  number: number;
  kind: 'wikipedia' | 'verification';
  title: string;
  text: string;
  // Où lire : Wikipédia, ou le nom du vérificateur.
  label: string;
  url: string;
  // Seulement pour une vérification : la conclusion du vérificateur, telle qu'il l'a écrite.
  rating: string | null;
};

export type Reference = { number: number; title: string; href: string; label: string };

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

// Les vérifications d'abord (plus proches de la question), puis Wikipédia ; quatre au plus.
export function buildExternal(wikipedia: readonly Wikipedia[], checks: readonly FactCheck[]) {
  const items: External[] = [];
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
      });
    }
  }
  for (const article of wikipedia) {
    const url = safeUrl(article.url, '.wikipedia.org');
    if (url) {
      items.push({
        number: 0,
        kind: 'wikipedia',
        title: article.title,
        text: clip(article.summary),
        label: 'Wikipédia',
        url,
        rating: null,
      });
    }
  }
  return items.slice(0, MAX_ITEMS).map((item, index) => ({ ...item, number: index + 1 }));
}

// Ce que le modèle voit : le texte, sans l'adresse.
export function externalForModel(items: readonly External[]) {
  return items.map(({ number, kind, title, text, label, rating }) => ({
    number,
    kind,
    title,
    text,
    label,
    rating,
  }));
}

// Les liens des sources que le modèle a citées, construits ici.
export function buildReferences(cited: readonly number[], items: readonly External[]): Reference[] {
  const unique = [...new Set(cited)];
  return unique.flatMap((number) => {
    const item = items.find((entry) => entry.number === number);
    return item ? [{ number, title: item.title, href: item.url, label: item.label }] : [];
  });
}
