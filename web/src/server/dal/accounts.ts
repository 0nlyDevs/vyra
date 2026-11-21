import 'server-only';
import { randomUUID } from 'node:crypto';
import { and, eq, gt, isNull, ne } from 'drizzle-orm';
import type { AuthTokenPurpose } from '@/lib/domain';
import { tokenHash } from '@/server/auth/tokens';
import { db } from '@/server/db';
import { accounts, authTokens, profiles, sessions } from '@/server/db/schema';

// Comptes, sessions et liens envoyés par e-mail.

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function findAccountByEmail(email: string) {
  const [account] = await db
    .select({ account: accounts, profile: profiles })
    .from(accounts)
    .innerJoin(profiles, eq(profiles.id, accounts.profileId))
    .where(eq(accounts.email, normalizeEmail(email)))
    .limit(1);
  return account ?? null;
}

export async function findAccountByGoogleSub(googleSub: string) {
  const [account] = await db
    .select({ account: accounts, profile: profiles })
    .from(accounts)
    .innerJoin(profiles, eq(profiles.id, accounts.profileId))
    .where(eq(accounts.googleSub, googleSub))
    .limit(1);
  return account ?? null;
}

export async function getAccount(profileId: string) {
  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.profileId, profileId))
    .limit(1);
  return account ?? null;
}

// Nouveau profil (citoyen) et son compte, ensemble.
export async function createAccount(input: {
  name: string;
  email: string;
  passwordHash?: string | null;
  googleSub?: string | null;
  emailVerified?: boolean;
}) {
  return db.transaction(async (tx) => {
    const [profile] = await tx
      .insert(profiles)
      .values({
        id: randomUUID(),
        name: input.name,
        role: 'member',
        headline: 'Membre de la communauté',
      })
      .returning();
    if (!profile) throw new Error('profile not created');
    await tx.insert(accounts).values({
      profileId: profile.id,
      email: normalizeEmail(input.email),
      passwordHash: input.passwordHash ?? null,
      googleSub: input.googleSub ?? null,
      emailVerifiedAt: input.emailVerified ? new Date() : null,
    });
    return profile;
  });
}

export async function linkGoogle(profileId: string, googleSub: string) {
  await db
    .update(accounts)
    .set({ googleSub, emailVerifiedAt: new Date() })
    .where(eq(accounts.profileId, profileId));
}

// ─── Sessions ────────────────────────────────────────────────────────────────────────────────

export async function createSession(profileId: string, token: string, expiresAt: Date) {
  await db.insert(sessions).values({ id: tokenHash(token), profileId, expiresAt });
}

export async function findSessionProfile(token: string) {
  const [found] = await db
    .select({ profile: profiles })
    .from(sessions)
    .innerJoin(profiles, eq(profiles.id, sessions.profileId))
    .where(and(eq(sessions.id, tokenHash(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return found?.profile ?? null;
}

export async function deleteSession(token: string) {
  await db.delete(sessions).where(eq(sessions.id, tokenHash(token)));
}

// Après un changement de mot de passe : ferme toutes les autres sessions de la personne.
export async function deleteOtherSessions(profileId: string, keepToken: string | null) {
  await db
    .delete(sessions)
    .where(
      keepToken
        ? and(eq(sessions.profileId, profileId), ne(sessions.id, tokenHash(keepToken)))
        : eq(sessions.profileId, profileId),
    );
}

// ─── Liens envoyés par e-mail ────────────────────────────────────────────────────────────────

export async function createAuthToken(
  profileId: string,
  purpose: AuthTokenPurpose,
  token: string,
  expiresAt: Date,
) {
  await db.insert(authTokens).values({ id: tokenHash(token), profileId, purpose, expiresAt });
}

// Consomme un lien valide (bon usage, pas expiré, pas déjà utilisé). Rend le profil concerné.
export async function consumeAuthToken(token: string, purpose: AuthTokenPurpose) {
  const [used] = await db
    .update(authTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(authTokens.id, tokenHash(token)),
        eq(authTokens.purpose, purpose),
        isNull(authTokens.usedAt),
        gt(authTokens.expiresAt, new Date()),
      ),
    )
    .returning({ profileId: authTokens.profileId });
  return used?.profileId ?? null;
}

// Un lien encore valide, sans le consommer (page « nouveau mot de passe » avant l'envoi).
export async function isAuthTokenValid(token: string, purpose: AuthTokenPurpose) {
  const [found] = await db
    .select({ id: authTokens.id })
    .from(authTokens)
    .where(
      and(
        eq(authTokens.id, tokenHash(token)),
        eq(authTokens.purpose, purpose),
        isNull(authTokens.usedAt),
        gt(authTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return Boolean(found);
}

export async function markEmailVerified(profileId: string) {
  await db
    .update(accounts)
    .set({ emailVerifiedAt: new Date() })
    .where(and(eq(accounts.profileId, profileId), isNull(accounts.emailVerifiedAt)));
}

export async function setPassword(profileId: string, passwordHash: string) {
  await db.update(accounts).set({ passwordHash }).where(eq(accounts.profileId, profileId));
}
