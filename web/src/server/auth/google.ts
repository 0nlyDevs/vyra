import 'server-only';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

// Connexion avec Google (OAuth 2.0, code d'autorisation avec PKCE), sans bibliothèque.
// Les identifiants se créent dans la console Google Cloud (voir README) ; sans eux, le bouton
// « Continuer avec Google » n'apparaît pas.

const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

export const GOOGLE_CALLBACK_PATH = '/api/auth/google/callback';
// Cookie de courte durée : état et vérificateur PKCE, entre le départ et le retour de Google.
export const OAUTH_COOKIE = 'mindstack_google_oauth';

export function isGoogleEnabled() {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

function redirectUri() {
  return new URL(GOOGLE_CALLBACK_PATH, env.APP_URL).toString();
}

export function codeChallenge(verifier: string) {
  return createHash('sha256').update(verifier).digest('base64url');
}

export function authorizationUrl(state: string, verifier: string) {
  const url = new URL(AUTHORIZE_URL);
  url.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID ?? '',
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: codeChallenge(verifier),
    code_challenge_method: 'S256',
    prompt: 'select_account',
  }).toString();
  return url;
}

const tokenSchema = z.object({ access_token: z.string() });
const userSchema = z.object({
  sub: z.string(),
  email: z.email(),
  email_verified: z.boolean().default(false),
  name: z.string().optional(),
  given_name: z.string().optional(),
});

export type GoogleUser = z.infer<typeof userSchema>;

// Échange le code contre l'identité Google de la personne. null en cas de problème.
export async function fetchGoogleUser(code: string, verifier: string): Promise<GoogleUser | null> {
  try {
    const tokenResponse = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID ?? '',
        client_secret: env.GOOGLE_CLIENT_SECRET ?? '',
        redirect_uri: redirectUri(),
        grant_type: 'authorization_code',
        code_verifier: verifier,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const token = tokenSchema.safeParse(await tokenResponse.json());
    if (!tokenResponse.ok || !token.success) {
      logger.warn('google : échange du code refusé', { status: tokenResponse.status });
      return null;
    }
    const userResponse = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${token.data.access_token}` },
      signal: AbortSignal.timeout(10_000),
    });
    const user = userSchema.safeParse(await userResponse.json());
    return userResponse.ok && user.success ? user.data : null;
  } catch (error) {
    logger.warn('google : connexion impossible', {
      error: error instanceof Error ? error.name : 'unknown',
    });
    return null;
  }
}
