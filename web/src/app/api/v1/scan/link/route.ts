import { analyzeLink } from '@/features/scan/link-actions';
import { apiResult, readJson } from '@/server/api';

// Scan d'un lien : `{ url, text? }` (le texte collé quand la page ne se lit pas de l'extérieur).
// La page lue, ses affirmations, son âge, les vérifications publiées ; jamais de verdict. Pour en
// faire une enquête : `POST /cases` avec `{ claim: mainClaim, sourceUrl: url, sourceName: site }`.
export async function POST(request: Request) {
  const body = (await readJson(request)) as Record<string, unknown> | null;
  return apiResult(
    await analyzeLink({
      url: typeof body?.url === 'string' ? body.url : '',
      text: typeof body?.text === 'string' ? body.text : undefined,
    }),
  );
}
