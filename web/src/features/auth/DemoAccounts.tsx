import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signInAs } from '@/features/demo/actions';
import { PROFILE_ROLE_LABELS } from '@/lib/domain';
import { demoMode } from '@/lib/env';
import { DEMO_PROFILES } from '@/server/demo/seed-data';

// Accès en un clic aux comptes de démo, pour la scène : pas de mot de passe à taper devant le jury.
export function DemoAccounts() {
  if (!demoMode) return null;
  return (
    <section id="demo" aria-labelledby="demo-title" className="grid gap-3">
      <h2 id="demo-title" className="font-bold text-foreground text-sm">
        Comptes de démo
      </h2>
      <div className="grid gap-2">
        {DEMO_PROFILES.map((profile) => (
          <form key={profile.id} action={signInAs}>
            <input type="hidden" name="profileId" value={profile.id} />
            <Button
              type="submit"
              variant="outline"
              className="h-auto w-full justify-between gap-3 rounded-[20px] bg-card px-5 py-3.5 text-left hover:bg-raised"
            >
              <span className="grid">
                <span className="font-bold">{profile.name}</span>
                <span className="whitespace-normal font-normal text-muted-foreground text-sm">
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
