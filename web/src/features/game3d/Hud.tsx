'use client';

import {
  ArrowRight,
  CalendarDays,
  Camera,
  CircleCheck,
  CircleX,
  ImageIcon,
  Lightbulb,
  Link,
  type LucideIcon,
  Maximize2,
  Minimize2,
  MousePointerClick,
  Newspaper,
  Square,
  UserRound,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { ToneBadge } from '@/components/common/ToneBadge';
import { FormMessage } from '@/components/form/FormField';
import { Button } from '@/components/ui/button';
import type { Debrief } from '@/features/game/actions';
import { ClueCard } from '@/features/game/ClueCard';
import { CoachAdvice } from '@/features/game/GamePlay';
import {
  CLUE_KIND_LABELS,
  type ClueKind,
  type ClueRating,
  GAME_ANSWER_LABELS,
  GAME_ANSWER_TONES,
  GAME_ANSWERS,
  type GameAnswer,
} from '@/lib/domain';
import { cn } from '@/lib/utils';
import type { ScenarioClue } from '@/server/db/schema';
import { STAMP_ON, STAMPS } from './constants';
import type { Target, View } from './world';

export const CLUE_ICONS = {
  source: Link,
  date: CalendarDays,
  image: ImageIcon,
  author: UserRound,
  other_media: Newspaper,
} satisfies Record<ClueKind, LucideIcon>;

// Un raccourci clavier, aussi cliquable à la souris (en pause, quand le curseur est libre).
function HintButton({
  keys,
  label,
  onClick,
}: {
  keys: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-8 items-center gap-1.5 rounded-xl px-1.5 py-1 transition-colors duration-150 hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
    >
      <span className={KEY}>{keys}</span>
      {label}
    </button>
  );
}

export const KEY =
  'rounded-md border border-white/30 bg-white/12 px-1.5 py-0.5 font-mono text-[0.75rem] text-white';

// Le cadre fixe du jeu : avancement, indices, réglages, viseur et choix du tampon.
export function Hud({
  round,
  total,
  clues,
  revealed,
  ratings,
  target,
  selected,
  answered,
  muted,
  fullscreen,
  view,
  onView,
  onSelect,
  onCycle,
  onMute,
  onFullscreen,
  onSwitch2D,
}: {
  round: number;
  total: number;
  clues: ScenarioClue[];
  revealed: ClueKind[];
  ratings: Partial<Record<ClueKind, ClueRating>>;
  target: Target | null;
  selected: GameAnswer;
  answered: boolean;
  muted: boolean;
  fullscreen: boolean;
  view: View;
  onView: () => void;
  onSelect: (answer: GameAnswer) => void;
  onCycle: () => void;
  onMute: () => void;
  onFullscreen: () => void;
  onSwitch2D: () => void;
}) {
  const stamp = STAMPS[selected];
  return (
    // Pas de z-index ici : la barre du haut passe au-dessus du calque de pause (z-30), le reste dessous.
    <div className="pointer-events-none absolute inset-0 select-none text-white">
      {/* Haut : avancement, indices, réglages. */}
      <div className="relative z-40 flex items-start justify-between gap-3 p-4">
        <div className="grid gap-2 rounded-2xl bg-black/35 px-4 py-3 backdrop-blur-md">
          <p className="eyebrow whitespace-nowrap text-[0.68rem]!">
            Vrai ou fake · la rue du marché
          </p>
          <p className="font-semibold text-lg tabular-nums leading-none">
            Information {round + 1} <span className="text-white/75">/ {total}</span>
          </p>
          <div className="flex gap-1.5">
            {Array.from({ length: total }, (_, index) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: une case par manche, dans l'ordre.
                key={index}
                className={cn(
                  'h-1.5 w-7 rounded-full transition-colors duration-500',
                  index < round ? 'bg-primary' : index === round ? 'bg-white' : 'bg-white/20',
                )}
              />
            ))}
          </div>
        </div>

        <ul
          className="hidden gap-1.5 rounded-2xl bg-black/35 p-2 backdrop-blur-md xl:flex"
          aria-label="Indices de cette information"
        >
          {clues.map((clue) => {
            const Icon = CLUE_ICONS[clue.kind];
            const seen = revealed.includes(clue.kind);
            const rating = ratings[clue.kind];
            return (
              <li
                key={clue.kind}
                title={CLUE_KIND_LABELS[clue.kind]}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs transition-colors duration-300',
                  !seen && 'bg-white/8 text-white/75',
                  seen && !rating && 'bg-white/15',
                  rating === 'reliable' && 'bg-success/30 text-white',
                  rating === 'suspicious' && 'bg-warning/35 text-white',
                )}
              >
                <Icon aria-hidden className="size-3.5" />
                <span className="hidden 2xl:inline">{CLUE_KIND_LABELS[clue.kind]}</span>
                {seen ? (
                  <CircleCheck aria-label="vu" className="size-3.5" />
                ) : (
                  <Square aria-label="à voir" className="size-3 opacity-60" />
                )}
              </li>
            );
          })}
        </ul>

        <div className="pointer-events-auto flex shrink-0 gap-1.5 rounded-2xl bg-black/35 p-1.5 backdrop-blur-md">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/15 hover:text-white"
            onClick={onMute}
            aria-label={muted ? 'Activer le son' : 'Couper le son'}
          >
            {muted ? <VolumeX aria-hidden /> : <Volume2 aria-hidden />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/15 hover:text-white"
            onClick={onFullscreen}
            aria-label={fullscreen ? 'Quitter le plein écran' : 'Plein écran'}
          >
            {fullscreen ? <Minimize2 aria-hidden /> : <Maximize2 aria-hidden />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/15 hover:text-white"
            onClick={onView}
            title="Changer de vue (V)"
            aria-label={
              view === 'third' ? 'Passer en vue subjective' : 'Passer en vue à la 3e personne'
            }
          >
            <Camera aria-hidden data-icon="inline-start" />
            <span className="hidden lg:inline">
              {view === 'third' ? '3e personne' : '1re personne'}
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/15 hover:text-white"
            onClick={onSwitch2D}
          >
            Mode 2D
          </Button>
        </div>
      </div>

      {/* Viseur. */}
      <div className="absolute top-1/2 left-1/2 grid -translate-x-1/2 -translate-y-1/2 justify-items-center gap-3">
        <div
          className={cn(
            'grid place-items-center rounded-full border-2 transition-all duration-200 ease-out',
            target?.kind === 'board' && !answered
              ? 'size-12 border-[3px]'
              : target?.kind === 'clue'
                ? 'size-10 border-white'
                : 'size-5 border-white/60',
          )}
          style={
            target?.kind === 'board' && !answered
              ? { borderColor: stamp.color, boxShadow: `0 0 24px ${stamp.color}` }
              : undefined
          }
        >
          <span className="size-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(0,0,0,0.8)]" />
        </div>
      </div>
      {target && (
        <p className="absolute top-[calc(50%+2.6rem)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/55 px-3 py-1.5 text-sm backdrop-blur-md">
          {target.kind === 'clue' ? (
            <>
              <span className={KEY}>E</span> ou clic · examiner{' '}
              {CLUE_KIND_LABELS[target.clue].toLowerCase()}
            </>
          ) : answered ? (
            'Déjà tamponnée'
          ) : (
            <>
              <MousePointerClick aria-hidden className="mr-1 inline size-4 align-[-0.2em]" />
              Tamponner « {GAME_ANSWER_LABELS[selected]} »
            </>
          )}
        </p>
      )}

      {/* Bas : raccourcis et choix du tampon. Au-dessus du calque de pause : cliquables en pause. */}
      <div className="absolute inset-x-0 bottom-0 z-40 flex flex-wrap items-end justify-between gap-3 p-4">
        <div className="pointer-events-auto hidden max-w-sm flex-wrap items-center gap-1.5 rounded-2xl bg-black/50 p-2 text-white/90 text-xs backdrop-blur-md lg:flex">
          <span className="px-1.5">
            <span className={KEY}>Z Q S D</span> marcher · <span className={KEY}>Maj</span> courir
          </span>
          <HintButton keys="1 2 3" label="encre" onClick={onCycle} />
          <HintButton keys="V" label="vue" onClick={onView} />
          <HintButton keys="F" label="plein écran" onClick={onFullscreen} />
          <HintButton keys="M" label={muted ? 'son coupé' : 'son'} onClick={onMute} />
        </div>
        <fieldset
          aria-label="Encre du tampon"
          className="pointer-events-auto mx-auto flex min-w-0 gap-2 rounded-[1.4rem] border-0 bg-black/55 p-2 backdrop-blur-md"
        >
          {GAME_ANSWERS.map((answer) => {
            const active = answer === selected;
            return (
              <button
                key={answer}
                type="button"
                onClick={() => onSelect(answer)}
                aria-pressed={active}
                className={cn(
                  'flex min-h-11 items-center gap-2 rounded-2xl px-4 py-2.5 font-semibold transition-[transform,background-color,color] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black/60',
                  active ? '-translate-y-1' : 'text-white/85 hover:bg-white/12 hover:text-white',
                )}
                style={
                  active
                    ? {
                        background: STAMPS[answer].color,
                        color: STAMP_ON,
                        boxShadow: `0 10px 30px -8px ${STAMPS[answer].color}`,
                      }
                    : undefined
                }
              >
                <span
                  className={cn(KEY, active && 'border-black/30 bg-black/10')}
                  style={active ? { color: STAMP_ON } : undefined}
                >
                  {STAMPS[answer].key}
                </span>
                {GAME_ANSWER_LABELS[answer]}
              </button>
            );
          })}
        </fieldset>
        <span className="hidden w-xs lg:block" />
      </div>
    </div>
  );
}

// Un indice examiné : la carte se retourne sous les yeux du joueur, qui la note.
export function CluePanel({
  clue,
  rating,
  answered,
  onRate,
  onClose,
}: {
  clue: ScenarioClue;
  rating: ClueRating | undefined;
  answered: boolean;
  onRate: (rating: ClueRating) => void;
  onClose: () => void;
}) {
  const [flipped, setFlipped] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setFlipped(true), 180);
    return () => window.clearTimeout(timer);
  }, []);
  const Icon = CLUE_ICONS[clue.kind];
  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-black/45 p-4 backdrop-blur-[3px] animate-in fade-in-0 duration-200">
      <div className="dark grid w-full max-w-md gap-4 rounded-3xl border border-white/10 bg-background/90 p-5 text-foreground shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <p className="flex items-center gap-2 font-semibold text-lg">
          <Icon aria-hidden className="size-5 text-primary" />
          {CLUE_KIND_LABELS[clue.kind]}
        </p>
        <p className="text-muted-foreground text-sm">
          Cet indice rend-il l’information fiable, ou suspecte ?
        </p>
        <ClueCard
          clue={clue}
          revealed={flipped}
          rating={rating}
          answered={answered}
          onReveal={() => setFlipped(true)}
          onRate={onRate}
        />
        <Button size="lg" onClick={onClose} className="justify-self-start">
          Retour dans la rue
          <ArrowRight aria-hidden data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}

// Après le tampon : la bonne réponse, l'explication, le réflexe et le conseil du coach.
export function ResultPanel({
  correct,
  title,
  answer,
  explanation,
  reflex,
  debrief,
  debriefPending,
  isLast,
  pending,
  error,
  onNext,
}: {
  correct: boolean;
  title: string;
  answer: GameAnswer;
  explanation: string;
  reflex: string;
  debrief: Debrief | null;
  debriefPending: boolean;
  isLast: boolean;
  pending: boolean;
  error: string | null;
  onNext: () => void;
}) {
  return (
    <aside
      aria-live="polite"
      className="dark absolute top-24 right-3 bottom-3 z-20 flex w-[min(28rem,calc(100%-1.5rem))] flex-col gap-4 overflow-y-auto rounded-3xl border border-white/10 bg-background/88 p-6 text-foreground shadow-2xl backdrop-blur-xl animate-in fade-in-0 slide-in-from-right-10 duration-500"
    >
      <div
        className={cn(
          'flex items-center gap-3 rounded-2xl p-4',
          correct ? 'bg-success-soft' : 'bg-danger-soft',
        )}
      >
        {correct ? (
          <CircleCheck aria-hidden className="size-8 text-success" />
        ) : (
          <CircleX aria-hidden className="size-8 text-danger" />
        )}
        <div>
          <p className="font-semibold text-2xl leading-tight">
            {correct ? 'Bien tamponné !' : 'La rumeur se propage…'}
          </p>
          <p className="text-muted-foreground text-sm">
            {correct
              ? 'La rue vous remercie.'
              : 'Pas tout à fait : voyez ce qu’il fallait remarquer.'}
          </p>
        </div>
      </div>
      <ToneBadge tone={GAME_ANSWER_TONES[answer]} className="justify-self-start">
        {title} : {GAME_ANSWER_LABELS[answer].toLowerCase()}
      </ToneBadge>
      <p className="text-pretty text-lg leading-relaxed">{explanation}</p>
      <p className="flex items-start gap-2 font-medium">
        <Lightbulb aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
        Le réflexe à garder : {reflex}
      </p>
      <CoachAdvice debrief={debrief} pending={debriefPending} />
      <FormMessage message={error} />
      <Button size="lg" onClick={onNext} disabled={pending} className="mt-auto justify-self-start">
        {isLast ? (pending ? 'Calcul du score…' : 'Voir mon score') : 'Information suivante'}
        <ArrowRight aria-hidden data-icon="inline-end" />
      </Button>
    </aside>
  );
}
