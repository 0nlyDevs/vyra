import type { ReactNode } from 'react';
import { AuthShell } from '@/features/auth/AuthShell';
import { publicEnv } from '@/lib/env';

// Pages de compte (connexion, inscription, mot de passe, confirmation) : hors de l'espace connecté.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthShell appName={publicEnv.NEXT_PUBLIC_APP_NAME}>{children}</AuthShell>;
}
