import Link from 'next/link';
import { redirect } from 'next/navigation';
import { GoogleButton, OrSeparator } from '@/features/auth/GoogleButton';
import { SignupForm } from '@/features/auth/SignupForm';
import { AFTER_SIGN_IN_PATH } from '@/lib/navigation';
import { isGoogleEnabled } from '@/server/auth/google';
import { getCurrentProfile } from '@/server/session';

export const metadata = { title: 'Créer un compte' };

export default async function SignupPage() {
  if (await getCurrentProfile()) redirect(AFTER_SIGN_IN_PATH);

  return (
    <div className="grid gap-8">
      <header>
        <h1 className="pub-h2 text-foreground">
          Votre <em>compte</em>.
        </h1>
        <p className="mt-3 text-muted-foreground">
          Un nom, une adresse, un mot de passe : vous pouvez utiliser Vyra tout de suite.
        </p>
      </header>
      <div className="grid gap-5">
        {isGoogleEnabled() && (
          <>
            <GoogleButton label="S’inscrire avec Google" />
            <OrSeparator />
          </>
        )}
        <SignupForm />
      </div>
      <p className="text-muted-foreground text-sm">
        Un e-mail de confirmation vous est envoyé. Déjà inscrit ?{' '}
        <Link
          href="/login"
          className="font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
        >
          Se connecter
        </Link>
      </p>
    </div>
  );
}
