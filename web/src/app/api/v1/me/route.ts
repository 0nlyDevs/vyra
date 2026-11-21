import { apiOk, requireApiProfile } from '@/server/api';

export async function GET() {
  const auth = await requireApiProfile();
  if ('response' in auth) return auth.response;
  const { id, name, role, headline } = auth.profile;
  return apiOk({ id, name, role, headline });
}
