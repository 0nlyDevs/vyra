import { Globe, MapPin } from 'lucide-react';
import { FEED_REGION_LABELS, FEED_REGIONS, type FeedRegion } from '@/lib/domain';
import { cn } from '@/lib/utils';
import { chooseRegion } from './actions';

const REGION_DETAILS = {
  mg: {
    icon: MapPin,
    description: 'Presse, télévisions et Facebook malgaches, avec l’essentiel du monde.',
  },
  world: {
    icon: Globe,
    description: 'Presse internationale, recherches qui montent et vérifications.',
  },
} satisfies Record<FeedRegion, { icon: typeof Globe; description: string }>;

// Le choix de la région, à la première visite du fil.
export function RegionChooser() {
  return (
    <section aria-labelledby="region-title" className="mx-auto grid w-full max-w-2xl gap-6 py-6">
      <div className="grid gap-2">
        <h2 id="region-title" className="font-semibold text-2xl tracking-tight">
          Où êtes-vous ?
        </h2>
        <p className="text-muted-foreground">
          Le fil montre d’abord ce qui circule dans votre région, puis ce qui concerne le monde
          entier. Vous pourrez changer plus tard.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {FEED_REGIONS.map((region) => {
          const { icon: Icon, description } = REGION_DETAILS[region];
          return (
            <form key={region} action={chooseRegion}>
              <input type="hidden" name="region" value={region} />
              <button
                type="submit"
                className="grid h-full w-full gap-3 surface p-5 text-left transition-[border-color,transform] duration-150 ease-out hover:border-primary active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-ring"
              >
                <Icon aria-hidden className="size-6 text-primary" />
                <span className="font-semibold text-lg">{FEED_REGION_LABELS[region]}</span>
                <span className="text-muted-foreground text-sm">{description}</span>
              </button>
            </form>
          );
        })}
      </div>
    </section>
  );
}

// Le changement de région, en haut du fil.
export function RegionSwitch({ current }: { current: FeedRegion }) {
  return (
    <fieldset className="m-0 flex min-w-0 gap-1 rounded-full border-0 bg-foreground/[0.05] p-1 shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--foreground)_6%,transparent)]">
      <legend className="sr-only">Région du fil</legend>
      {FEED_REGIONS.map((region) => (
        <form key={region} action={chooseRegion}>
          <input type="hidden" name="region" value={region} />
          <button
            type="submit"
            aria-pressed={region === current}
            className={cn(
              'whitespace-nowrap rounded-full px-3.5 py-1.5 font-medium text-sm transition-colors',
              region === current
                ? 'bg-foreground/[0.1] text-foreground shadow-[inset_0_1px_0_var(--sheen)]'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {FEED_REGION_LABELS[region]}
          </button>
        </form>
      ))}
    </fieldset>
  );
}
