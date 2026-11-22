import { searchWeb } from '@/features/investigation/actions';
import { apiResult } from '@/server/api';

// Chercher d'autres versions dans la presse : les articles qui rapportent la même information
// deviennent des versions du dossier. `{ status, kept, contradicting, … }`.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return apiResult(await searchWeb(id));
}
