import Link from 'next/link';
import { ErrorState } from '@/components/states/States';
import { Button } from '@/components/ui/button';
import { ResetPasswordForm } from '@/features/auth/ResetPasswordForm';
import { isAuthTokenValid } from '@/server/dal/accounts';

export const metadata = { title: 'Nouveau mot de passe' };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const valid = token ? await isAuthTokenValid(token, 'reset_password') : false;

  return (
    <div className="grid gap-8">
      <header>
        <h1 className="pub-h2 text-foreground">
          Nouveau <em>mot de passe</em>
        </h1>
        {valid && <p className="mt-3 text-muted-foreground">Vos autres sessions seront fermées.</p>}
      </header>
      {valid && token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <>
          <ErrorState
            title="Ce lien n’est plus valable."
            description="Il a expiré ou a déjà servi. Demandez-en un nouveau."
          />
          <Button asChild size="xl" className="justify-self-start">
            <Link href="/forgot-password">Recevoir un nouveau lien</Link>
          </Button>
        </>
      )}
    </div>
  );
}
