import { askAssistant } from '@/features/assistant/actions';
import { apiFail, apiOk, readJson, requireApiProfile } from '@/server/api';

// L'assistant : une question (et un peu d'historique), une réponse qui cite des affaires jugées.
export async function POST(request: Request) {
  const auth = await requireApiProfile();
  if ('response' in auth) return auth.response;
  const body = (await readJson(request)) as {
    question?: string;
    pathname?: string;
    history?: { role: 'user' | 'assistant'; text: string }[];
  } | null;
  const result = await askAssistant({
    question: body?.question ?? '',
    pathname: body?.pathname ?? '/',
    history: body?.history ?? [],
  });
  return result.ok ? apiOk(result.data) : apiFail(result.error.code, result.error.fieldErrors);
}
