import 'server-only';
import { hashPassword, needsRehash } from '@/server/auth/password';
import { setPassword } from '@/server/dal/accounts';

// Une empreinte faite avec d'anciens réglages scrypt est refaite avec les réglages actuels, au seul
// moment où l'on a le mot de passe en clair : juste après une connexion réussie. Jamais dans un
// fichier « use server » : chaque fonction exportée y serait appelable depuis le navigateur.
export async function upgradePasswordHash(
  profileId: string,
  password: string,
  stored: string | null,
) {
  if (stored && needsRehash(stored)) await setPassword(profileId, await hashPassword(password));
}
