import Link from 'next/link';
import { ErrorState } from '@/components/states/States';
import { Button } from '@/components/ui/button';
import { ResetPasswordForm } from '@/features/auth/ResetPasswordForm';
import { isAuthTokenValid } from '@/server/dal/accounts';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const valid = token ? await isAuthTokenValid(token, 'reset_password') : false;

  return (
    <div className="grid gap-8">
      <header className="grid gap-2">
        <h1 className="font-semibold text-3xl">Nouveau mot de passe</h1>
        {valid && <p className="text-muted-foreground">Vos autres sessions seront fermées.</p>}
      </header>
      {valid && token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <>
          <ErrorState
            title="Ce lien n’est plus valable."
            description="Il a expiré ou a déjà servi. Demandez-en un nouveau."
          />
          <Button asChild className="justify-self-start">
            <Link href="/forgot-password">Recevoir un nouveau lien</Link>
          </Button>
        </>
      )}
    </div>
  );
}
