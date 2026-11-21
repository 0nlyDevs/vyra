import type { ReactNode } from 'react';
import { AuthShell } from '@/features/auth/AuthShell';

// Pages de compte (connexion, inscription, mot de passe, confirmation) : hors de l'espace connecté.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}
