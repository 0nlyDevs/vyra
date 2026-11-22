'use server';

import { redirect } from 'next/navigation';
import { type ActionResult, fail, ok } from '@/lib/action-result';
import { ERRORS } from '@/lib/errors';
import { AFTER_SIGN_IN_PATH } from '@/lib/navigation';
import { dummyPasswordHash, hashPassword, verifyPassword } from '@/server/auth/password';
import {
  consumeAuthToken,
  createAccount,
  deleteOtherSessions,
  findAccountByEmail,
  getAccount,
  setPassword,
} from '@/server/dal/accounts';
import { isUniqueViolation } from '@/server/db';
import { clientIp, signInAllowed, withinLimit } from '@/server/rate-limit';
import { getCurrentProfile, startSession } from '@/server/session';
import { sendPasswordResetEmail, sendVerificationEmail } from './links';
import { forgotPasswordSchema, resetPasswordSchema, signInSchema, signUpSchema } from './schema';

// Comptes : inscription, connexion, mot de passe oublié, confirmation d'adresse.
// Les messages restent généraux : on ne dit jamais si c'est l'e-mail ou le mot de passe qui est faux.

export async function signUp(
  _previous: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  const parsed = signUpSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) return fail(ERRORS.VALIDATION_FAILED, parsed.error);
  if (!(await withinLimit(`signup:ip:${await clientIp()}`, 10, 60 * 60))) {
    return fail(ERRORS.RATE_LIMITED);
  }
  if (await findAccountByEmail(parsed.data.email)) return fail(ERRORS.EMAIL_TAKEN);

  let profile: Awaited<ReturnType<typeof createAccount>>;
  try {
    profile = await createAccount({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
    });
  } catch (error) {
    // Deux envois rapides : le second bute sur l'unicité de l'e-mail.
    if (isUniqueViolation(error)) return fail(ERRORS.EMAIL_TAKEN);
    throw error;
  }
  // L'e-mail de confirmation part sans bloquer : on peut utiliser l'application tout de suite.
  await sendVerificationEmail(profile, parsed.data.email);
  await startSession(profile.id);
  redirect(AFTER_SIGN_IN_PATH);
}

export async function signIn(
  _previous: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) return fail(ERRORS.VALIDATION_FAILED, parsed.error);
  if (!(await signInAllowed(parsed.data.email))) return fail(ERRORS.RATE_LIMITED);

  const found = await findAccountByEmail(parsed.data.email);
  if (found && !found.account.passwordHash) return fail(ERRORS.GOOGLE_ONLY_ACCOUNT);
  const valid = await verifyPassword(
    parsed.data.password,
    found?.account.passwordHash ?? (await dummyPasswordHash()),
  );
  if (!found || !valid) return fail(ERRORS.INVALID_CREDENTIALS);

  await startSession(found.profile.id);
  redirect(AFTER_SIGN_IN_PATH);
}

// Même réponse que l'adresse existe ou non : on ne révèle pas qui a un compte.
export async function requestPasswordReset(
  _previous: ActionResult<{ sent: true }> | null,
  formData: FormData,
): Promise<ActionResult<{ sent: true }>> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) return fail(ERRORS.VALIDATION_FAILED, parsed.error);
  // Contre l'envoi de dizaines d'e-mails à une même boîte.
  const allowed =
    (await withinLimit(`reset:ip:${await clientIp()}`, 10, 60 * 60)) &&
    (await withinLimit(`reset:email:${parsed.data.email}`, 3, 60 * 60));
  if (!allowed) return fail(ERRORS.RATE_LIMITED);

  const found = await findAccountByEmail(parsed.data.email);
  if (found) await sendPasswordResetEmail(found.profile, found.account.email);
  return ok({ sent: true });
}

export async function resetPassword(
  _previous: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get('token'),
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  });
  if (!parsed.success) return fail(ERRORS.VALIDATION_FAILED, parsed.error);

  const profileId = await consumeAuthToken(parsed.data.token, 'reset_password');
  if (!profileId) return fail(ERRORS.LINK_INVALID);
  await setPassword(profileId, await hashPassword(parsed.data.password));
  // Un nouveau mot de passe ferme toutes les sessions ouvertes, puis on en ouvre une ici.
  await deleteOtherSessions(profileId, null);
  await startSession(profileId);
  redirect(AFTER_SIGN_IN_PATH);
}

export async function resendVerification(): Promise<ActionResult<{ sent: boolean }>> {
  const profile = await getCurrentProfile();
  if (!profile) return fail(ERRORS.UNAUTHORIZED);
  const account = await getAccount(profile.id);
  if (!account || account.emailVerifiedAt) return ok({ sent: false });
  if (!(await withinLimit(`verify:profile:${profile.id}`, 3, 60 * 60))) {
    return fail(ERRORS.RATE_LIMITED);
  }
  return ok({ sent: await sendVerificationEmail(profile, account.email) });
}
