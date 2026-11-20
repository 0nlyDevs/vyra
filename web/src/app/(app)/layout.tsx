import { LogOut } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { signOut } from '@/features/demo/actions';
import { ResetDemoButton } from '@/features/demo/ResetDemoButton';
import { PROFILE_ROLE_LABELS } from '@/lib/domain';
import { publicEnv } from '@/lib/env';
import { requireProfile } from '@/server/session';

// Espace connecté : en-tête commun, avec le profil de démo et le bouton de réinitialisation.
export default async function AppLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-8 py-4">
          <Link href="/dashboard" className="font-semibold text-xl">
            {publicEnv.NEXT_PUBLIC_APP_NAME}
          </Link>
          <div className="flex flex-wrap items-center gap-4">
            <ResetDemoButton />
            <span className="text-muted-foreground">
              {profile.name} · {PROFILE_ROLE_LABELS[profile.role]}
            </span>
            <form action={signOut}>
              <Button type="submit" variant="ghost" aria-label="Changer de profil">
                <LogOut aria-hidden />
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-8 py-10">{children}</main>
    </div>
  );
}
