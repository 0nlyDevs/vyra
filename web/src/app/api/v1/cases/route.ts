import { apiOk, requireApiProfile } from '@/server/api';
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
