import { searchFactChecks } from '@/features/investigation/actions';
import { apiResult } from '@/server/api';

// Ce qu'en disent déjà les vérificateurs de faits, et Wikipédia : `{ factChecks, wikipedia,
// searched }`. Rien n'est enregistré : la personne choisit ce qu'elle verse au dossier.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return apiResult(await searchFactChecks(id));
}
