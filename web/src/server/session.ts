import 'server-only';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { env } from '@/lib/env';
import { newToken } from '@/server/auth/tokens';
import { createSession, deleteSession, findSessionProfile } from '@/server/dal/accounts';

// La personne connectée. Le cookie garde un jeton tiré au hasard ; la session vit en base
// (table `sessions`) et dure 30 jours. Les modules n'utilisent que getCurrentProfile() et
// requireProfile() : la façon de se connecter (e-mail, Google, compte de démo) ne les concerne pas.
const COOKIE_NAME = 'vyra_session';
const SESSION_DAYS = 30;

// Le jeton de session : le cookie du site, ou `Authorization: Bearer <jeton>` pour l'application
// mobile (même session, même table). Les modules n'ont pas à s'en soucier.
async function readToken() {
  const fromCookie = (await cookies()).get(COOKIE_NAME)?.value;
  if (fromCookie) return fromCookie;
  const authorization = (await headers()).get('authorization');
  return authorization?.match(/^Bearer\s+(\S+)$/i)?.[1] ?? null;
}

export async function getCurrentProfile() {
  const token = await readToken();
  return token ? findSessionProfile(token) : null;
}

export async function requireProfile() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');
  return profile;
}

// Jeton de la session en cours (pour la garder ouverte quand on ferme les autres).
export async function currentSessionToken() {
  return readToken();
}

// À appeler depuis une server action ou une route (seuls endroits où l'on peut poser un cookie).
export async function startSession(profileId: string) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await createSession(profileId, token, expiresAt);
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    // Jamais en clair sur le réseau en ligne ; le PC reste en http://localhost.
    secure: env.APP_URL.startsWith('https://'),
    path: '/',
    expires: expiresAt,
  });
}

export async function endSession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) await deleteSession(token);
  store.delete(COOKIE_NAME);
}
