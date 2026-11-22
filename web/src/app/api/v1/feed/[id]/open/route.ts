import { caseForPost } from '@/features/feed/actions';
import { apiResult } from '@/server/api';

// « Voir l'affaire » depuis une publication du fil : son affaire, ou une enquête ouverte pour elle.
// `{ caseId }`.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return apiResult(await caseForPost(id));
}
