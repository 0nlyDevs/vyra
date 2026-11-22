import { addInstitution } from '@/features/impersonation/actions';
import { apiResult, readJson } from '@/server/api';

// Ajouter une institution (vérificateur) : mêmes champs que le formulaire du site, les listes en
// texte séparé par des virgules.
export async function POST(request: Request) {
  return apiResult(await addInstitution(await readJson(request)), 201);
}
