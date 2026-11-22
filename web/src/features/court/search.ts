// Chaque sujet est vectorisé séparément, en plus de la demande entière : une recherche sur
// « Poutine et Donald Trump » peut retrouver un dossier sur Trump sans citer Poutine.
export function courtSearchQueries(query: string) {
  const whole = query.trim().replace(/\s+/g, ' ');
  const subjects = whole
    .split(/\s+(?:et|ou|avec)\s+|[,;]/i)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3);
  const seen = new Set<string>();
  return [whole, ...subjects]
    .filter((part) => {
      const key = part.toLocaleLowerCase('fr');
      if (!part || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 5);
}

export function caseSearchText(item: { title: string; claim: string }) {
  return `${item.title}. ${item.claim}`.slice(0, 1500);
}
