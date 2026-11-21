import Link from 'next/link';
import { redirect } from 'next/navigation';
import { GoogleButton, OrSeparator } from '@/features/auth/GoogleButton';
import { SignupForm } from '@/features/auth/SignupForm';
import { AFTER_SIGN_IN_PATH } from '@/lib/navigation';
import { isGoogleEnabled } from '@/server/auth/google';
import { getCurrentProfile } from '@/server/session';

export default async function SignupPage() {
  if (await getCurrentProfile()) redirect(AFTER_SIGN_IN_PATH);

  return (
    <div className="grid gap-8">
      <header className="grid gap-2">
        <h1 className="font-semibold text-3xl">Créer un compte</h1>
        <p className="text-muted-foreground">
          Déjà inscrit ?{' '}
          <Link href="/login" className="text-primary underline-offset-4 hover:underline">
            Se connecter
          </Link>
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
      <p className="text-muted-foreground text-xs">
        Un e-mail de confirmation vous est envoyé. Vous pouvez utiliser MindStack tout de suite.
      </p>
    </div>
  );
}
