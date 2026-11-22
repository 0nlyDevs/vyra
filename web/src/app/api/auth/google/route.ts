import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { authorizationUrl, isGoogleEnabled, OAUTH_COOKIE } from '@/server/auth/google';
import { newToken } from '@/server/auth/tokens';

// Départ de « Continuer avec Google » : on garde l'état et le vérificateur PKCE dans un cookie
// de courte durée, puis on envoie la personne chez Google.

export async function GET() {
  if (!isGoogleEnabled()) {
    return NextResponse.redirect(new URL('/login?error=google-disabled', env.APP_URL));
  }
  const state = newToken();
  const verifier = newToken();
  (await cookies()).set(OAUTH_COOKIE, JSON.stringify({ state, verifier }), {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.APP_URL.startsWith('https://'),
    path: '/api/auth/google',
    maxAge: 10 * 60,
  });
  return NextResponse.redirect(authorizationUrl(state, verifier));
}
