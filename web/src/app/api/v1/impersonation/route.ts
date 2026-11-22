import { checkMessage } from '@/features/impersonation/actions';
import { apiResult, readJson } from '@/server/api';

// « Est-ce bien eux ? » : `{ message, sender? }` comparé à l'annuaire officiel, sans IA.
export async function POST(request: Request) {
  return apiResult(await checkMessage(await readJson(request)));
}
