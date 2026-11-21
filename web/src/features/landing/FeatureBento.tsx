import { CircleHelp, Gavel, Newspaper, Siren, Waypoints } from 'lucide-react';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { CertaintyBadge } from '@/components/common/DomainBadges';
import { ToneBadge } from '@/components/common/ToneBadge';
import { Reveal } from '@/components/motion/Reveal';
import { cn } from '@/lib/utils';

// Le parcours d'une information, en cinq cases à double cadre (coque fine autour d'un cœur).

function Cell({
  step,
  icon,
  title,
  text,
  className,
  delay = 0,
  children,
}: {
  step: string;
  icon: ReactNode;
  title: string;
  text: string;
  className?: string;
  delay?: number;
  children?: ReactNode;
}) {
  return (
    <Reveal delay={delay} className={cn('bezel', className)}>
      <article className="bezel-core grid h-full content-start gap-5 p-6 sm:p-7">
        <div className="flex items-center justify-between">
          <span className="flex size-10 items-center justify-center rounded-full bg-primary/12 text-primary">
            {icon}
          </span>
          <span className="font-mono text-muted-foreground text-xs tabular-nums">{step}</span>
        </div>
        <div className="grid gap-2">
          <h3 className="display text-[1.45rem]">{title}</h3>
          <p className="max-w-prose text-pretty text-muted-foreground leading-relaxed">{text}</p>
        </div>
        {children}
      </article>
    </Reveal>
  );
}

const TIMELINE = [
  { date: '12 mars 2019', source: 'Journal local, photo d’origine' },
  { date: 'Hier, 7 h 10', source: 'Page de quartier : « ce matin »' },
  { date: 'Hier, 9 h 15', source: 'Message transféré : « 3 morts »' },
];

export function FeatureBento() {
  return (
    <section
      id="parcours"
      aria-labelledby="features-title"
      className="mx-auto grid max-w-[84rem] scroll-mt-24 gap-12 px-5 py-24 lg:px-10"
    >
      <div className="grid max-w-3xl gap-5">
        <p className="eyebrow">Le parcours</p>
        <h2 id="features-title" className="display text-[clamp(2rem,4.4vw,3.6rem)]">
          D’une rumeur qui circule à une conclusion sur pièces.
        </h2>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Cell
          step="01"
          icon={<Newspaper aria-hidden className="size-5" />}
          title="Le fil d’actualité"
          text="Ce qui circule vraiment, à Madagascar et dans le monde : presse, télévisions, Facebook public. Chaque publication porte son état de vérification."
        >
          <div className="flex flex-wrap gap-2">
            <ToneBadge>Non vérifié</ToneBadge>
            <ToneBadge tone="info">En vérification</ToneBadge>
            <CertaintyBadge level="contradicted" />
          </div>
        </Cell>
        <Cell
          step="02"
          icon={<Waypoints aria-hidden className="size-5" />}
          title="L’histoire d’une information"
          text="Chaque version retrouvée, avec sa source, sa date et ce qui a changé en route."
          className="md:col-span-2"
          delay={0.08}
        >
          <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] sm:items-center">
            <Image
              src="/demo/inondation-2019.png"
              alt="Rue commerçante inondée, l’image qui circule dans l’affaire de démo"
              width={900}
              height={600}
              className="aspect-[3/2] w-full rounded-xl object-cover"
            />
            <ol className="grid gap-3.5">
              {TIMELINE.map((step) => (
                <li key={step.date} className="grid gap-0.5 border-primary/50 border-l-2 pl-3.5">
                  <span className="font-medium text-sm">{step.date}</span>
                  <span className="text-muted-foreground text-sm">{step.source}</span>
                </li>
              ))}
            </ol>
          </div>
        </Cell>
        <Cell
          step="03"
          icon={<Gavel aria-hidden className="size-5" />}
          title="Le tribunal"
          text="Deux IA plaident à partir des pièces du dossier. Vous votez avant que le juge conclue."
          className="md:col-span-2"
        >
          <div className="flex flex-wrap gap-2">
            {['Exacte', 'Trompeuse', 'Je ne sais pas'].map((label) => (
              <span
                key={label}
                className="rounded-full bg-foreground/[0.05] px-4 py-1.5 font-medium text-sm shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--foreground)_10%,transparent)]"
              >
                {label}
              </span>
            ))}
          </div>
        </Cell>
        <Cell
          step="04"
          icon={<Siren aria-hidden className="size-5" />}
          title="La boîte d’alertes"
          text="Cinq personnes signalent le même contenu : une vérification s’ouvre."
          delay={0.08}
        >
          <p className="display text-5xl tabular-nums">
            4<span className="text-2xl text-muted-foreground"> sur 5</span>
          </p>
        </Cell>
        <Cell
          step="05"
          icon={<CircleHelp aria-hidden className="size-5" />}
          title="Le jeu vrai ou fake"
          text="S’entraîner sur des informations inventées, et repartir avec un réflexe à chaque partie."
          className="md:col-span-3"
        >
          <div className="flex flex-wrap gap-2">
            {['Vrai', 'Fake', 'Impossible à dire'].map((label) => (
              <span
                key={label}
                className="rounded-full bg-foreground/[0.05] px-5 py-2 font-medium shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--foreground)_10%,transparent)]"
              >
                {label}
              </span>
            ))}
          </div>
        </Cell>
      </div>
    </section>
  );
}
