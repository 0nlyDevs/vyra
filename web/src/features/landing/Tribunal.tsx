'use client';

import { Check } from 'lucide-react';
import { type ReactNode, useRef, useState } from 'react';
import { CertaintyBadge, EvidenceStanceBadge } from '@/components/common/DomainBadges';
import { SpeechBubble } from '@/components/common/SpeechBubble';
import { ScrollTrigger, useGSAP } from './galaxy/motion';
import { Lines } from './Lines';

// Le tribunal, en deux colonnes : à gauche, la raison d'être
// reste en place ; à droite, l'audience défile étape par étape, celle en cours s'allume.
// Textes repris de l'affaire de démo « La photo de l'inondation » (lieux et médias inventés).

const STEPS: { label: string; body: ReactNode }[] = [
  {
    label: 'L’information jugée',
    body: (
      <p className="text-pretty font-medium text-[clamp(1.2rem,2vw,1.7rem)] leading-snug">
        « URGENT : inondation ce matin à Ambohitsoa-Nord, 3 morts, l’école est fermée. »
      </p>
    ),
  },
  {
    label: 'L’accusation plaide',
    body: (
      <SpeechBubble speaker="Accusation" caption="IA" tone="warning">
        La photo a été publiée le 12 mars 2019 (pièce n° 1). La mairie dit que l’école est ouverte
        (pièce n° 3).
      </SpeechBubble>
    ),
  },
  {
    label: 'La défense répond',
    body: (
      <SpeechBubble speaker="Défense" caption="IA" tone="info" side="end">
        Il a bien plu cette nuit (pièce n° 4). Je n’ai rien pour les victimes.
      </SpeechBubble>
    ),
  },
  {
    label: 'Vous votez, le juge conclut',
    body: (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-foreground/[0.04] px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-sm">Conclusion</span>
          <CertaintyBadge level="contradicted" />
        </div>
        <div className="flex gap-1.5">
          <EvidenceStanceBadge stance="contradicts" />
          <EvidenceStanceBadge stance="context" />
        </div>
      </div>
    ),
  },
];

export function Tribunal() {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  useGSAP(
    () => {
      const section = root.current;
      if (!section) return;
      const triggers = Array.from(section.querySelectorAll<HTMLElement>('.court-step')).map(
        (step, i) =>
          ScrollTrigger.create({
            trigger: step,
            start: 'top 55%',
            end: 'bottom 55%',
            onToggle: (st) => {
              if (st.isActive) setActive(i);
            },
          }),
      );
      return () => {
        for (const trigger of triggers) trigger.kill();
      };
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="tribunal"
      aria-labelledby="court-title"
      className="court section wrap border-y"
    >
      <div className="court-grid">
        <aside className="court-side">
          <div className="grid gap-5">
            <p className="eyebrow" data-reveal="fade">
              Le tribunal
            </p>
            <Lines
              id="court-title"
              className="display h2-s"
              lines={[
                'Deux IA plaident.',
                <>
                  Vous <em>jugez</em>.
                </>,
              ]}
            />
            <p className="lead" data-reveal="fade">
              L’accusation et la défense ne citent que les pièces du dossier. Vous votez, puis le
              juge conclut avec un niveau de certitude, ou dit « informations insuffisantes ».
            </p>
            <div className="grid max-w-md grid-cols-2 gap-4 pt-2" data-reveal="fade">
              <div className="grid gap-1 border-primary border-l-2 pl-4">
                <span className="display text-4xl tabular-nums">88 %</span>
                <span className="text-muted-foreground text-sm">
                  de bonnes réponses en écoutant deux IA débattre
                </span>
              </div>
              <div className="grid gap-1 border-foreground/15 border-l-2 pl-4">
                <span className="display text-4xl text-muted-foreground tabular-nums">60 %</span>
                <span className="text-muted-foreground text-sm">seul, sans aide</span>
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              Personnes non expertes, d’après Khan et al., ICML 2024.
            </p>
          </div>
          <div className="ticks" aria-hidden>
            {STEPS.map((step, i) => (
              <span key={step.label} className={`tick${i <= active ? ' is-done' : ''}`}>
                <Check size={12} strokeWidth={3} />
              </span>
            ))}
          </div>
        </aside>
        <ol className="court-steps">
          {STEPS.map((step, i) => (
            <li key={step.label} className={`court-step${i === active ? ' is-active' : ''}`}>
              <div className="mono court-step-n">
                {String(i + 1).padStart(2, '0')} · {step.label}
              </div>
              <div className="court-step-body">{step.body}</div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
