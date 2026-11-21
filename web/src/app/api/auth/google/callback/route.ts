import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { env } from '@/lib/env';
import { AFTER_SIGN_IN_PATH } from '@/lib/navigation';
import { fetchGoogleUser, isGoogleEnabled, OAUTH_COOKIE } from '@/server/auth/google';
import {
  createAccount,
  findAccountByEmail,
  findAccountByGoogleSub,
  linkGoogle,
} from '@/server/dal/accounts';
import { sendMail } from '@/server/mail';
import { welcomeMail } from '@/server/mail-templates';
import { startSession } from '@/server/session';

const storedSchema = z.object({ state: z.string(), verifier: z.string() });

function back(path: string) {
  return NextResponse.redirect(new URL(path, env.APP_URL));
}

// Retour de Google : on vérifie l'état, on récupère l'identité, puis on retrouve le compte (par
// Google, puis par e-mail confirmé) ou on le crée.
export async function GET(request: NextRequest) {
  if (!isGoogleEnabled()) return back('/login?error=google-disabled');
  const store = await cookies();
  let stored: z.infer<typeof storedSchema> | null = null;
  try {
    const parsed = storedSchema.safeParse(JSON.parse(store.get(OAUTH_COOKIE)?.value ?? 'null'));
    stored = parsed.success ? parsed.data : null;
  } catch {
    stored = null;
  }
  store.delete(OAUTH_COOKIE);

  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  if (!stored || !code || state !== stored.state) return back('/login?error=google');

  const user = await fetchGoogleUser(code, stored.verifier);
  if (!user) return back('/login?error=google');

  let profileId = (await findAccountByGoogleSub(user.sub))?.profile.id;
  if (!profileId && user.email_verified) {
    // Un compte e-mail existe avec la même adresse, confirmée par Google : on les relie.
    const byEmail = await findAccountByEmail(user.email);
    if (byEmail) {
      await linkGoogle(byEmail.profile.id, user.sub);
      profileId = byEmail.profile.id;
    }
  }
  if (!profileId) {
    if (await findAccountByEmail(user.email)) return back('/login?error=google-email-taken');
    const name = user.given_name || user.name || user.email.split('@')[0] || 'Membre';
    const profile = await createAccount({
      name,
      email: user.email,
      googleSub: user.sub,
      emailVerified: user.email_verified,
    });
    profileId = profile.id;
    await sendMail(
      welcomeMail(user.email, name, new URL(AFTER_SIGN_IN_PATH, env.APP_URL).toString()),
    );
  }

  await startSession(profileId);
  return back(AFTER_SIGN_IN_PATH);
}
