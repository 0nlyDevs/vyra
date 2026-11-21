import 'server-only';
import type { AuthTokenPurpose } from '@/lib/domain';
import { env } from '@/lib/env';
import { newToken } from '@/server/auth/tokens';
import { createAuthToken } from '@/server/dal/accounts';
import { sendMail } from '@/server/mail';
import { resetPasswordMail, verifyEmailMail } from '@/server/mail-templates';

// Liens envoyés par e-mail : on crée le jeton, on construit l'adresse, on envoie.

const VALIDITY_MS = {
  verify_email: 24 * 60 * 60 * 1000,
  reset_password: 60 * 60 * 1000,
} satisfies Record<AuthTokenPurpose, number>;
const PATHS = { verify_email: '/verify-email', reset_password: '/reset-password' } satisfies Record<
  AuthTokenPurpose,
  string
>;

async function createLink(profileId: string, purpose: AuthTokenPurpose) {
  const token = newToken();
  await createAuthToken(profileId, purpose, token, new Date(Date.now() + VALIDITY_MS[purpose]));
  const url = new URL(PATHS[purpose], env.APP_URL);
  url.searchParams.set('token', token);
  return url.toString();
}

export async function sendVerificationEmail(profile: { id: string; name: string }, email: string) {
  const url = await createLink(profile.id, 'verify_email');
  return sendMail(verifyEmailMail(email, profile.name, url));
}

export async function sendPasswordResetEmail(profile: { id: string; name: string }, email: string) {
  const url = await createLink(profile.id, 'reset_password');
  return sendMail(resetPasswordMail(email, profile.name, url));
}
