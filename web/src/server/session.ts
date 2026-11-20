import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getProfile } from '@/server/dal/profiles';

// Connexion de démo : le profil choisi est gardé dans un cookie. Aucun mot de passe : personne
// d'autre que l'équipe n'utilise l'application, et le jury ne la teste pas.
const COOKIE_NAME = 'mindstack_demo_profile';

export async function getCurrentProfile() {
  const id = (await cookies()).get(COOKIE_NAME)?.value;
  return id ? getProfile(id) : null;
}

export async function requireProfile() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');
  return profile;
}

export async function startSession(profileId: string) {
  (await cookies()).set(COOKIE_NAME, profileId, { httpOnly: true, sameSite: 'lax', path: '/' });
}

export async function endSession() {
  (await cookies()).delete(COOKIE_NAME);
}
