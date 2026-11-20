import { ErrorState } from '@/components/states/States';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { signInAs } from '@/features/demo/actions';
import { PROFILE_ROLE_LABELS } from '@/lib/domain';
import { logger } from '@/lib/logger';
import { listProfiles } from '@/server/dal/profiles';

async function loadProfiles() {
  try {
    return await listProfiles();
  } catch (error) {
    logger.error('login : base injoignable', { error });
    return null;
  }
}

// Connexion de démo : un clic sur un profil, sans mot de passe.
export default async function LoginPage() {
  const profiles = await loadProfiles();

  return (
    <main className="mx-auto grid min-h-screen max-w-3xl content-center gap-8 px-8">
      <h1 className="font-semibold text-3xl">Choisissez un profil</h1>
      {profiles === null && (
        <ErrorState
          title="La base de données ne répond pas."
          description="Lancez « make db » à la racine du dépôt, puis rechargez la page."
        />
      )}
      {profiles?.length === 0 && (
        <ErrorState
          title="Aucun profil de démo."
          description="Lancez « make seed » à la racine du dépôt, puis rechargez la page."
        />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {profiles?.map((profile) => (
          <form key={profile.id} action={signInAs}>
            <input type="hidden" name="profileId" value={profile.id} />
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-xl">{profile.name}</CardTitle>
                <CardDescription>
                  {PROFILE_ROLE_LABELS[profile.role]} · {profile.headline}
                </CardDescription>
              </CardHeader>
              <div className="px-4">
                <Button type="submit" className="w-full">
                  Entrer en tant que {profile.name}
                </Button>
              </div>
            </Card>
          </form>
        ))}
      </div>
    </main>
  );
}
