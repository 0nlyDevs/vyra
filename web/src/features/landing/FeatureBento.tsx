import { CircleHelp, Gavel, Newspaper, Siren, Waypoints } from 'lucide-react';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { CaseStatusBadge, CertaintyBadge } from '@/components/common/DomainBadges';
import { cn } from '@/lib/utils';

// Les cinq fonctionnalités, en grille : cinq cases pour cinq idées, chacune avec son propre fond.

function Cell({
  icon,
  title,
  text,
  className,
  children,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <article
      className={cn(
        'grid content-start gap-4 overflow-hidden rounded-2xl border p-6 transition-transform duration-200 ease-out hover:-translate-y-0.5 motion-reduce:transition-none',
        className,
      )}
    >
      <div className="grid gap-2">
        <span className="flex items-center gap-2 font-semibold text-lg">
          {icon}
          {title}
        </span>
        <p className="max-w-prose text-pretty text-muted-foreground">{text}</p>
      </div>
      {children}
    </article>
  );
}

const TIMELINE = [
  { date: '12 mars 2019', source: 'Journal local, photo d’origine' },
  { date: 'Hier, 7 h 10', source: 'Page de quartier : « ce matin »' },
  { date: 'Hier, 9 h 15', source: 'Message transféré : « 3 morts »' },
];

export function FeatureBento() {
  return (
    <section aria-labelledby="features-title" className="mx-auto grid max-w-6xl gap-8 px-6 py-20">
      <h2 id="features-title" className="max-w-2xl font-semibold text-3xl md:text-4xl">
        Suivre une information, de la rumeur à la preuve
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        <Cell
          icon={<Newspaper aria-hidden className="size-5 text-primary" />}
          title="Fil d’actualité"
          text="Les informations qui circulent, chacune avec son état de vérification."
          className="bg-card"
        >
          <div className="flex flex-wrap gap-2">
            <CaseStatusBadge status="open" />
            <CaseStatusBadge status="investigating" />
            <CertaintyBadge level="contradicted" />
          </div>
        </Cell>

        <Cell
          icon={<Waypoints aria-hidden className="size-5 text-primary" />}
          title="L’histoire d’une information"
          text="Chaque version retrouvée, avec sa source, sa date et ce qui a changé."
          className="bg-card md:col-span-2"
        >
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] sm:items-center">
            <Image
              src="/demo/inondation-2019.png"
              alt="Rue commerçante inondée, l’image qui circule dans l’affaire de démo"
              width={900}
              height={600}
              className="aspect-[3/2] w-full rounded-xl object-cover"
            />
            <ol className="grid gap-3">
              {TIMELINE.map((step) => (
                <li key={step.date} className="grid gap-0.5 border-primary/40 border-l-2 pl-3">
                  <span className="font-medium text-sm">{step.date}</span>
                  <span className="text-muted-foreground text-sm">{step.source}</span>
                </li>
              ))}
            </ol>
          </div>
        </Cell>

        <Cell
          icon={<Gavel aria-hidden className="size-5 text-primary" />}
          title="Le tribunal"
          text="Deux IA plaident à partir des pièces. Vous votez avant que le juge conclue."
          className="border-primary/20 bg-accent md:col-span-2"
        >
          <div className="flex flex-wrap gap-2">
            {['Exacte', 'Trompeuse', 'Je ne sais pas'].map((label) => (
              <span
                key={label}
                className="rounded-full border border-primary/30 bg-card px-3 py-1 font-medium text-sm"
              >
                {label}
              </span>
            ))}
          </div>
        </Cell>

        <Cell
          icon={<Siren aria-hidden className="size-5 text-primary" />}
          title="La boîte d’alertes"
          text="Cinq personnes différentes signalent le même contenu : une vérification s’ouvre."
          className="bg-muted"
        >
          <p className="font-semibold text-4xl tabular-nums">
            4<span className="text-muted-foreground text-2xl"> sur 5</span>
          </p>
        </Cell>

        <Cell
          icon={<CircleHelp aria-hidden className="size-5 text-primary" />}
          title="Le jeu vrai ou fake"
          text="S’entraîner sur des informations inventées, apprendre un réflexe à chaque partie."
          className="bg-card md:col-span-3"
        >
          <div className="flex flex-wrap gap-2">
            {['Vrai', 'Fake', 'Impossible à dire'].map((label) => (
              <span key={label} className="rounded-lg bg-muted px-4 py-2 font-medium">
                {label}
              </span>
            ))}
          </div>
        </Cell>
      </div>
    </section>
  );
}
