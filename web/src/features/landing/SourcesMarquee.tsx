import { FEED_SOURCES } from '@/features/feed/sources';

// Les vraies sources lues par le fil d'actualité, en bandeau qui défile. Écrit deux fois de
// suite : la bande avance de moitié puis recommence, sans à-coup.
export function SourcesMarquee() {
  const names = FEED_SOURCES.map((source) => source.name.split(' · ')[0].split(' #')[0]);
  const band = [...new Set(names.filter((name) => name !== 'Tendances')), 'Google Trends'];
  return (
    <section aria-labelledby="sources-title" className="border-y py-10">
      <p id="sources-title" className="eyebrow mb-6 px-5 text-center">
        Lu en direct, chaque jour
      </p>
      <div className="marquee-mask overflow-hidden">
        <div className="marquee-track flex w-max gap-12 pr-12 motion-reduce:animate-none">
          {[0, 1].map((copy) => (
            <ul
              key={copy}
              aria-hidden={copy === 1}
              className="flex shrink-0 items-center gap-12 text-[clamp(1.2rem,2.2vw,1.8rem)] text-foreground/55"
            >
              {band.map((name) => (
                <li key={name} className="display flex items-center gap-12 whitespace-nowrap">
                  {name}
                  <span aria-hidden className="size-1.5 rounded-full bg-primary/70" />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}
