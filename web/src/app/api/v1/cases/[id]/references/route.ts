import { addReferenceToCase } from '@/features/investigation/actions';
import { apiResult, readJson } from '@/server/api';

// Verser une vérification publiée ou un article Wikipédia au dossier, comme sur le site : mêmes
// champs que `addReferenceSchema` (sans `caseId`, pris dans l'adresse).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await readJson(request)) as Record<string, unknown> | null;
  return apiResult(await addReferenceToCase({ ...body, caseId: id }), 201);
}
