import 'server-only';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { profiles } from '@/server/db/schema';

export function listProfiles() {
  // 'admin' avant 'member' : le profil principal de la démo apparaît en premier.
  return db.select().from(profiles).orderBy(asc(profiles.role), asc(profiles.name));
}

export async function getProfile(id: string) {
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
  return profile ?? null;
}
