import { LogOut } from 'lucide-react';
import type { ReactNode } from 'react';
import { Logo } from '@/components/brand/Logo';
import { AppSidebar, AppTopNav } from '@/components/shell/AppNav';
import { ReadingControls } from '@/components/shell/ReadingControls';
import { ThemeToggle } from '@/components/shell/ThemeToggle';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { VerifyEmailBanner } from '@/features/auth/VerifyEmailBanner';
import { signOut } from '@/features/demo/actions';
import { ResetDemoButton } from '@/features/demo/ResetDemoButton';
import { PROFILE_ROLE_LABELS } from '@/lib/domain';
import { publicEnv } from '@/lib/env';
import { getAccount } from '@/server/dal/accounts';
import { requireProfile } from '@/server/session';

// Espace connecté : barre latérale, en-tête (profil, réinitialisation, thème) et contenu.
// Toute page placée dans src/app/(app)/ reçoit cette coquille sans rien faire.
export default async function AppLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();
  const account = await getAccount(profile.id);

  return (
    <div className="flex min-h-screen">
      <AppSidebar appName={publicEnv.NEXT_PUBLIC_APP_NAME} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="glass sticky top-0 z-20 flex flex-wrap items-center gap-3 px-6 py-2.5 shadow-none">
          <Logo name={publicEnv.NEXT_PUBLIC_APP_NAME} className="md:hidden" />
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <ResetDemoButton />
            <div className="flex items-center gap-2.5 rounded-full py-1 pr-3 pl-1 shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--foreground)_8%,transparent)]">
              <Avatar className="size-7">
                <AvatarFallback className="bg-primary/15 font-medium text-primary text-xs">
                  {profile.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="grid leading-tight">
                <span className="font-medium text-sm">{profile.name}</span>
                <span className="text-muted-foreground text-xs">
                  {PROFILE_ROLE_LABELS[profile.role]}
                </span>
              </div>
            </div>
            <ReadingControls />
            <ThemeToggle />
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="icon" aria-label="Se déconnecter">
                <LogOut aria-hidden />
              </Button>
            </form>
          </div>
        </header>
        {account && !account.emailVerifiedAt && <VerifyEmailBanner email={account.email} />}
        <AppTopNav />
        <div className="relative isolate flex flex-1 flex-col">
          {/* Lueur rouge en haut de chaque page, comme la lumière d'horizon de l'accueil. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(60%_70%_at_30%_0%,color-mix(in_oklch,var(--glow)_16%,transparent),transparent_70%)] dark:bg-[radial-gradient(60%_70%_at_30%_0%,color-mix(in_oklch,var(--glow)_22%,transparent),transparent_70%)]"
          />
          <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 lg:px-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
