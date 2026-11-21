import { LogOut } from 'lucide-react';
import type { ReactNode } from 'react';
import { AppSidebar, AppTopNav } from '@/components/shell/AppNav';
import { ThemeToggle } from '@/components/shell/ThemeToggle';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { signOut } from '@/features/demo/actions';
import { ResetDemoButton } from '@/features/demo/ResetDemoButton';
import { PROFILE_ROLE_LABELS } from '@/lib/domain';
import { publicEnv } from '@/lib/env';
import { requireProfile } from '@/server/session';

// Espace connecté : barre latérale, en-tête (profil de démo, réinitialisation, thème) et contenu.
// Toute page placée dans src/app/(app)/ reçoit cette coquille sans rien faire.
export default async function AppLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();

  return (
    <div className="flex min-h-screen">
      <AppSidebar appName={publicEnv.NEXT_PUBLIC_APP_NAME} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b bg-background/85 px-6 py-3 backdrop-blur">
          <p className="font-semibold md:hidden">{publicEnv.NEXT_PUBLIC_APP_NAME}</p>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <ResetDemoButton />
            <div className="flex items-center gap-2 px-2">
              <Avatar>
                <AvatarFallback>{profile.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="grid leading-tight">
                <span className="font-medium text-sm">{profile.name}</span>
                <span className="text-muted-foreground text-xs">
                  {PROFILE_ROLE_LABELS[profile.role]}
                </span>
              </div>
            </div>
            <ThemeToggle />
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="icon" aria-label="Changer de profil">
                <LogOut aria-hidden />
              </Button>
            </form>
          </div>
        </header>
        <AppTopNav />
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
