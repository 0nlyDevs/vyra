import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ErrorState } from '@/components/states/States';
import { DemoAccounts } from '@/features/auth/DemoAccounts';
import { GoogleButton, OrSeparator } from '@/features/auth/GoogleButton';
import { LoginForm } from '@/features/auth/LoginForm';
import { AFTER_SIGN_IN_PATH } from '@/lib/navigation';
import { isGoogleEnabled } from '@/server/auth/google';
import { getCurrentProfile } from '@/server/session';

const ERROR_MESSAGES: Record<string, string> = {
  google: 'La connexion avec Google n’a pas abouti. Réessayez.',
  'google-disabled': 'La connexion avec Google n’est pas configurée sur ce poste.',
  'google-email-taken':
    'Un compte existe déjà avec cette adresse. Connectez-vous avec votre mot de passe.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getCurrentProfile()) redirect(AFTER_SIGN_IN_PATH);
  const { error } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] : undefined;

  return (
    <div className="grid gap-8">
      <header>
        <h1 className="pub-h2 text-foreground">
          Bon <em>retour</em>.
        </h1>
        <p className="mt-3 text-muted-foreground">
          Reprenez vos enquêtes, vos audiences et vos alertes là où vous les avez laissées.
        </p>
      </header>
      {errorMessage && <ErrorState title={errorMessage} description="" />}
      <div className="grid gap-5">
        {isGoogleEnabled() && (
          <>
            <GoogleButton />
            <OrSeparator />
          </>
        )}
        <LoginForm />
      </div>
      <DemoAccounts />
      <p className="text-muted-foreground text-sm">
        Pas encore de compte ?{' '}
        <Link
          href="/signup"
          className="font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
        >
          Créer un compte
        </Link>
      </p>
    </div>
  );
}
