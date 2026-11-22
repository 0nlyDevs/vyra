'use client';

import Image from 'next/image';
import { type ReactNode, useEffect, useRef } from 'react';
import { CertaintyBadge } from '@/components/common/DomainBadges';
import { ToneBadge } from '@/components/common/ToneBadge';
import { drawPlaceholder } from './galaxy/clipSources';
import { REEL_CLIP } from './galaxy/content';
import { gsap, ScrollTrigger, useGSAP, useReducedMotion } from './galaxy/motion';

// Le parcours d'une information : une piste horizontale épinglée.
// La première case porte la promesse et l'emplacement où la torche du hero pose sa carte ; les
// cinq suivantes sont les étapes du produit.

const TIMELINE = [
  { date: '12 mars 2019', source: 'Journal local, photo d’origine' },
  { date: 'Hier, 7 h 10', source: 'Page de quartier : « ce matin »' },
  { date: 'Hier, 9 h 15', source: 'Message transféré : « 3 morts »' },
];

const Pill = ({ children }: { children: ReactNode }) => (
  <span className="rounded-full bg-foreground/[0.05] px-4 py-1.5 font-medium text-sm shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--foreground)_10%,transparent)]">
    {children}
  </span>
);

const STOPS: { n: string; label: string; text: string; visual: ReactNode }[] = [
  {
    n: '01',
    label: 'Le fil d’actualité',
    text: 'Ce qui circule vraiment, à Madagascar et dans le monde : presse, télévisions, Facebook public. Chaque publication porte son état de vérification.',
    visual: (
      <div className="flex flex-wrap gap-2">
        <ToneBadge>Non vérifié</ToneBadge>
        <ToneBadge tone="info">En vérification</ToneBadge>
        <CertaintyBadge level="contradicted" />
      </div>
    ),
  },
  {
    n: '02',
    label: 'L’histoire d’une information',
    text: 'Chaque version retrouvée, avec sa source, sa date et ce qui a changé en route.',
    visual: (
      <div className="flex flex-wrap items-center gap-6">
        <Image
          src="/demo/inondation-2019.png"
          alt="Rue commerçante inondée, l’image qui circule dans l’affaire de démo"
          width={900}
          height={600}
          className="aspect-[3/2] w-56 rounded-xl object-cover"
        />
        <ol className="grid gap-3">
          {TIMELINE.map((step) => (
            <li key={step.date} className="grid gap-0.5 border-primary/50 border-l-2 pl-3.5">
              <span className="font-medium text-sm">{step.date}</span>
              <span className="text-muted-foreground text-sm">{step.source}</span>
            </li>
          ))}
        </ol>
      </div>
    ),
  },
  {
    n: '03',
    label: 'Le tribunal',
    text: 'Deux IA plaident à partir des pièces du dossier. Vous votez avant que le juge conclue.',
    visual: (
      <div className="flex flex-wrap gap-2">
        {['Exacte', 'Trompeuse', 'Je ne sais pas'].map((label) => (
          <Pill key={label}>{label}</Pill>
        ))}
      </div>
    ),
  },
  {
    n: '04',
    label: 'La boîte d’alertes',
    text: 'Cinq personnes signalent le même contenu : une vérification s’ouvre.',
    visual: (
      <p className="stat-num">
        4<span className="text-[0.4em] text-muted-foreground"> sur 5</span>
      </p>
    ),
  },
  {
    n: '05',
    label: 'Le jeu vrai ou fake',
    text: 'S’entraîner sur des informations inventées, et repartir avec un réflexe à chaque partie.',
    visual: (
      <div className="flex flex-wrap gap-2">
        {['Vrai', 'Fake', 'Impossible à dire'].map((label) => (
          <Pill key={label}>{label}</Pill>
        ))}
      </div>
    ),
  },
];

export function Parcours() {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const poster = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  // L'affiche de la carte, peinte comme les cartes de la galaxie : la carte 3D du hero se pose
  // dessus ; sans WebGL, l'affiche reste.
  useEffect(() => {
    const canvas = poster.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const draw = () => drawPlaceholder(ctx, canvas.width, canvas.height, REEL_CLIP, 0);
    draw();
    document.fonts?.ready.then(draw);
  }, []);

  useGSAP(
    () => {
      const section = root.current;
      const el = track.current;
      if (reduce || !section || !el) return;
      const size = () => {
        section.style.height = `${el.scrollWidth - window.innerWidth + window.innerHeight}px`;
      };
      size();
      ScrollTrigger.addEventListener('refreshInit', size);
      const tween = gsap.to(el, {
        x: () => -(el.scrollWidth - window.innerWidth),
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.8,
          invalidateOnRefresh: true,
        },
      });
      gsap.utils.toArray<HTMLElement>('.parcours .slide').forEach((slide, i) => {
        const items = slide.querySelectorAll<HTMLElement>('[data-in]');
        if (!items.length) return;
        gsap.fromTo(
          items,
          { y: 48, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.9,
            stagger: 0.1,
            ease: 'power3.out',
            scrollTrigger:
              i === 0
                ? { trigger: slide, start: 'top 96%', once: true }
                : { trigger: slide, containerAnimation: tween, start: 'left 78%', once: true },
          },
        );
      });
      return () => {
        ScrollTrigger.removeEventListener('refreshInit', size);
        section.style.height = '';
      };
    },
    { scope: root, dependencies: [reduce] },
  );

  return (
    <section
      ref={root}
      id="parcours"
      aria-labelledby="parcours-title"
      className={`parcours${reduce ? '' : ' is-pinned'}`}
    >
      <div ref={track} className="parcours-track" data-reel-track>
        <div className="slide is-head">
          <div className="head-copy">
            <p className="eyebrow" data-in>
              Le parcours
            </p>
            <h2 id="parcours-title" className="display h2" data-in>
              Un chatbot donne un avis. Vyra vous laisse <em>juger</em>.
            </h2>
            <p className="lead" data-in>
              Vyra montre d’où vient l’information, fait plaider les deux camps, puis conclut sur
              pièces.
            </p>
          </div>
          <figure className="reel" data-in>
            <div className="reel-slot" data-reel-slot>
              {REEL_CLIP.src ? (
                // La carte que la torche sort de la galaxie se pose sur cette vidéo, la même.
                <video
                  src={REEL_CLIP.src}
                  muted
                  loop
                  playsInline
                  autoPlay
                  preload="metadata"
                  aria-hidden
                />
              ) : (
                <canvas ref={poster} width={640} height={360} aria-hidden />
              )}
            </div>
            <figcaption className="mono">La pièce à juger · une info, deux camps</figcaption>
          </figure>
        </div>
        {STOPS.map((stop) => (
          <article className="slide" key={stop.n}>
            <div className="slide-time" data-in>
              {stop.n}
            </div>
            <div className="slide-place mono" data-in>
              {stop.label}
            </div>
            <p className="slide-text" data-in>
              {stop.text}
            </p>
            <div className="slide-visual" data-in>
              {stop.visual}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
