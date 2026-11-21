import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signInAs } from '@/features/demo/actions';
import { PROFILE_ROLE_LABELS } from '@/lib/domain';
import { DEMO_PROFILES } from '@/server/demo/seed-data';

// Accès en un clic aux comptes de démo, pour la scène : pas de mot de passe à taper devant le jury.
export function DemoAccounts() {
  return (
    <section id="demo" aria-labelledby="demo-title" className="grid gap-3">
      <h2 id="demo-title" className="font-medium text-muted-foreground text-sm">
        Comptes de démo
      </h2>
      <div className="grid gap-2">
        {DEMO_PROFILES.map((profile) => (
          <form key={profile.id} action={signInAs}>
            <input type="hidden" name="profileId" value={profile.id} />
            <Button
              type="submit"
              variant="outline"
              className="h-auto w-full justify-between gap-3 rounded-2xl px-4 py-3 text-left"
            >
              <span className="grid">
                <span className="font-medium">{profile.name}</span>
                <span className="font-normal text-muted-foreground text-xs">
                  {PROFILE_ROLE_LABELS[profile.role]} · {profile.headline}
                </span>
              </span>
              <ArrowRight aria-hidden />
            </Button>
          </form>
        ))}
      </div>
    </section>
  );
}
