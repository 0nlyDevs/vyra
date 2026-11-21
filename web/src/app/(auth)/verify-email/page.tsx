import { CircleCheck } from 'lucide-react';
import Link from 'next/link';
import { ErrorState } from '@/components/states/States';
import { Button } from '@/components/ui/button';
import { AFTER_SIGN_IN_PATH } from '@/lib/navigation';
import { consumeAuthToken, markEmailVerified } from '@/server/dal/accounts';

// Arrivée depuis le lien de l'e-mail de confirmation.
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const profileId = token ? await consumeAuthToken(token, 'verify_email') : null;
  if (profileId) await markEmailVerified(profileId);

  return (
    <div className="grid gap-6">
      {profileId ? (
        <>
          <CircleCheck aria-hidden className="size-10 text-success" />
          <h1 className="font-semibold text-3xl">Adresse confirmée</h1>
          <p className="text-muted-foreground">
            Vous recevrez les résultats de vos signalements à cette adresse.
          </p>
        </>
      ) : (
        <ErrorState
          title="Ce lien n’est plus valable."
          description="Il a expiré ou a déjà servi. Depuis l’application, le bandeau jaune permet d’en recevoir un nouveau."
        />
      )}
      <Button asChild className="justify-self-start">
        <Link href={AFTER_SIGN_IN_PATH}>Ouvrir Vyra</Link>
      </Button>
    </div>
  );
}
