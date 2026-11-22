import { startInvestigation } from '@/features/investigation/actions';
import { apiOk, apiResult, readJson, requireApiProfile } from '@/server/api';
import { listCaseImages, listCases } from '@/server/dal/cases';

// Les affaires, de la plus récente à la plus ancienne, chacune avec son image s'il y en a une.
export async function GET() {
  const auth = await requireApiProfile();
  if ('response' in auth) return auth.response;
  const [cases, images] = await Promise.all([listCases(), listCaseImages()]);
  return apiOk({
    cases: cases.map((item) => ({ ...item, imageUrl: images.get(item.id) ?? null })),
  });
}

// Nouvelle analyse : `{ claim, sourceUrl?, sourceName? }` → `{ caseId, matchedBy, reason }`.
// Comme le formulaire « Nouvelle analyse » du site : une affaire proche est retrouvée, sinon créée.
export async function POST(request: Request) {
  const body = (await readJson(request)) as Record<string, unknown> | null;
  return apiResult(
    await startInvestigation({
      claim: body?.claim,
      sourceUrl: body?.sourceUrl,
      sourceName: body?.sourceName,
    }),
    201,
  );
}
