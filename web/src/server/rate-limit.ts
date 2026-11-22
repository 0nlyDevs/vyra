import 'server-only';
import { sql } from 'drizzle-orm';
import { headers } from 'next/headers';
import { tokenHash } from '@/server/auth/tokens';
import { db } from '@/server/db';
import { rateLimits } from '@/server/db/schema';

// Limites anti-abus, comptées en base : les fonctions Vercel ne partagent pas leur mémoire.
// shortcut: les lignes expirées restent en base (une par IP ou e-mail), à purger si la table grossit.

// Compte un passage pour `key` ; false une fois `limit` dépassé dans la fenêtre en cours.
export async function withinLimit(key: string, limit: number, windowSeconds: number) {
  // L'heure de la base, pas celle du serveur : une horloge décalée fausserait les fenêtres.
  const resetAt = sql`now() + make_interval(secs => ${windowSeconds})`;
  const expired = sql`${rateLimits.resetAt} < now()`;
  const [row] = await db
    .insert(rateLimits)
    .values({ key: tokenHash(key), hits: 1, resetAt })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        hits: sql`case when ${expired} then 1 else ${rateLimits.hits} + 1 end`,
        resetAt: sql`case when ${expired} then excluded.reset_at else ${rateLimits.resetAt} end`,
      },
    })
    .returning({ hits: rateLimits.hits });
  return (row?.hits ?? 0) <= limit;
}

// Adresse IP de la personne : Vercel écrit `x-forwarded-for` lui-même (impossible à falsifier).
// Une salle entière derrière le même wifi partage la même IP : limites larges.
export async function clientIp() {
  const forwarded = (await headers()).get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || 'local';
}

// Connexion (site et application mobile) : contre les mots de passe devinés à la chaîne.
export async function signInAllowed(email: string) {
  const ip = await clientIp();
  return (
    (await withinLimit(`signin:ip:${ip}`, 30, 15 * 60)) &&
    (await withinLimit(`signin:email:${email}`, 10, 15 * 60))
  );
}
