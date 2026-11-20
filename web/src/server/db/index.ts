import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@/lib/env';
import * as schema from './schema';

// En développement, la connexion est gardée sur `globalThis` pour survivre au rechargement à chaud.
const globalForDb = globalThis as unknown as { mindstackSql?: postgres.Sql };

const client = globalForDb.mindstackSql ?? postgres(env.DATABASE_URL, { max: 5 });
if (env.NODE_ENV !== 'production') globalForDb.mindstackSql = client;

export const db = drizzle({ client, schema });
export type Database = typeof db;

// Ferme la connexion (scripts lancés hors de Next.js, comme le seed).
export async function closeDb() {
  await client.end({ timeout: 5 });
  globalForDb.mindstackSql = undefined;
}
