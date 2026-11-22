import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/components/brand/Logo';
import { TabBar, TabIsland } from '@/components/shell/AppNav';
import { PreferenceDock } from '@/components/shell/PreferenceDock';
import { UserMenu } from '@/components/shell/UserMenu';
import { Assistant } from '@/features/assistant/Assistant';
import { VerifyEmailBanner } from '@/features/auth/VerifyEmailBanner';
import { signOut } from '@/features/demo/actions';
import { ResetDemoButton } from '@/features/demo/ResetDemoButton';
import { isVerifier, PROFILE_ROLE_LABELS } from '@/lib/domain';
import { demoResetAllowed, publicEnv } from '@/lib/env';
import { getAccount } from '@/server/dal/accounts';
import { requireProfile } from '@/server/session';

// Espace connecté : pas de barre latérale. Une barre du haut sobre dit
// où l'on est (la marque, l'île d'onglets d'encre, l'avatar) ; les coins portent ce que l'on peut
// faire (préférences en bas à gauche, assistant en bas à droite). Sous 640 px, les onglets
// passent dans une barre d'encre au pouce. Toute page placée dans src/app/(app)/ reçoit cette
// coquille sans rien faire.
export default async function AppLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();
  const account = await getAccount(profile.id);
  const showDemoReset = demoResetAllowed && isVerifier(profile.role);

  return (
    <div data-app-shell data-scope="desk" className="min-h-dvh bg-background">
      <a
        href="#contenu"
        className="sr-only z-50 rounded-full bg-card px-4 py-2 font-bold text-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Aller au contenu
      </a>
      <header className="desk-bar" data-desk-bar>
        <div className="bar-brand">
          <Link href="/dashboard" className="bar-word">
            <Logo name={publicEnv.NEXT_PUBLIC_APP_NAME} />
          </Link>
        </div>
        <TabIsland />
        <div className="bar-right">
          <div className="hidden sm:block">{showDemoReset && <ResetDemoButton />}</div>
          <UserMenu
            name={profile.name}
            role={PROFILE_ROLE_LABELS[profile.role]}
            signOutAction={signOut}
          />
        </div>
      </header>
      {account && !account.emailVerifiedAt && <VerifyEmailBanner email={account.email} />}

      <main id="contenu" tabIndex={-1} className="desk-main outline-none">
        <div className="mx-auto w-full max-w-[90rem] px-4 pt-6 pb-10 sm:pt-8 min-[901px]:px-0">
          {/* Sur téléphone, la réinitialisation de la démo passe en haut de la page. Sans bouton,
              pas de bloc : sa marge laisserait un vide sous la barre. */}
          {showDemoReset && (
            <div className="mb-6 flex justify-end sm:hidden">
              <ResetDemoButton />
            </div>
          )}
          {children}
        </div>
      </main>

      <PreferenceDock />
      <TabBar />
      <Assistant />
    </div>
  );
}
