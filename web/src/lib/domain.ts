// Listes de valeurs du domaine et leurs libellés. Une valeur (code, en anglais) n'est jamais
// écrite en dur ailleurs : on importe la liste d'ici.

export const PROFILE_ROLES = ['admin', 'member'] as const;
export type ProfileRole = (typeof PROFILE_ROLES)[number];

export const PROFILE_ROLE_LABELS = {
  admin: 'Administrateur',
  member: 'Membre',
} satisfies Record<ProfileRole, string>;
