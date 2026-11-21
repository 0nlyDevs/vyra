'use client';

import {
  CalendarDays,
  Check,
  ImageIcon,
  Link,
  type LucideIcon,
  Newspaper,
  RotateCw,
  UserRound,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  CLUE_KIND_LABELS,
  CLUE_RATING_LABELS,
  CLUE_RATINGS,
  type ClueKind,
  type ClueRating,
} from '@/lib/domain';
import { cn } from '@/lib/utils';
import type { ScenarioClue } from '@/server/db/schema';

const CLUE_ICONS = {
  source: Link,
  date: CalendarDays,
  image: ImageIcon,
  author: UserRound,
  other_media: Newspaper,
} satisfies Record<ClueKind, LucideIcon>;

// Un indice à retourner, puis à noter. Le retournement est LE moment du jeu : 400 ms, avec un
// ease-out marqué ; en mouvement réduit, un simple fondu remplace la rotation.
// Les deux faces partagent la même case de grille : la carte prend la hauteur de la plus haute.
export function ClueCard({
  clue,
  revealed,
  rating,
  answered,
  onReveal,
  onRate,
}: {
  clue: ScenarioClue;
  revealed: boolean;
  rating: ClueRating | undefined;
  answered: boolean;
  onReveal: () => void;
  onRate: (rating: ClueRating) => void;
}) {
  const Icon = CLUE_ICONS[clue.kind];
  const label = CLUE_KIND_LABELS[clue.kind];
  const expected: ClueRating = clue.reliable ? 'reliable' : 'suspicious';

  return (
    <div className="perspective-distant">
      <div
        className={cn(
          'grid transition-transform duration-400 ease-[cubic-bezier(0.23,1,0.32,1)] transform-3d motion-reduce:transform-none motion-reduce:transition-none',
          revealed && 'rotate-y-180',
        )}
      >
        <button
          type="button"
          onClick={onReveal}
          inert={revealed}
          className={cn(
            'grid min-h-36 place-content-center justify-items-center gap-2 rounded-xl border bg-accent p-4 text-accent-foreground outline-none backface-hidden transition-[opacity,background-color,scale] duration-200 [grid-area:1/1] hover:bg-accent/70 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.98]',
            revealed && 'motion-reduce:opacity-0',
          )}
        >
          <Icon aria-hidden className="size-6" />
          <span className="font-semibold">{label}</span>
          <span className="flex items-center gap-1.5 text-sm opacity-80">
            <RotateCw aria-hidden className="size-3.5" />
            Retourner l’indice
          </span>
        </button>

        <div
          inert={!revealed}
          aria-hidden={!revealed}
          className={cn(
            'grid min-h-36 content-between gap-3 rounded-xl border bg-card p-4 backface-hidden transition-opacity duration-200 [grid-area:1/1] rotate-y-180 motion-reduce:transform-none',
            !revealed && 'motion-reduce:opacity-0',
          )}
        >
          <div className="grid gap-1.5">
            <p className="flex items-center gap-1.5 font-medium text-muted-foreground text-sm">
              <Icon aria-hidden className="size-4" />
              {label}
            </p>
            <p>{clue.content}</p>
          </div>

          {answered ? (
            <ClueVerdict rating={rating} expected={expected} />
          ) : (
            <fieldset className="flex flex-wrap gap-2">
              <legend className="sr-only">{label} : fiable ou suspect ?</legend>
              {CLUE_RATINGS.map((value) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={rating === value ? 'default' : 'outline'}
                  aria-pressed={rating === value}
                  onClick={() => onRate(value)}
                >
                  {CLUE_RATING_LABELS[value]}
                </Button>
              ))}
            </fieldset>
          )}
        </div>
      </div>
    </div>
  );
}

// Après la réponse : la note du joueur comparée à celle qu'il fallait donner.
function ClueVerdict({
  rating,
  expected,
}: {
  rating: ClueRating | undefined;
  expected: ClueRating;
}) {
  if (rating === expected) {
    return (
      <p className="flex items-center gap-1.5 font-medium text-sm text-success">
        <Check aria-hidden className="size-4" />
        Bien vu : {CLUE_RATING_LABELS[expected].toLowerCase()}
      </p>
    );
  }
  return (
    <p className="flex items-center gap-1.5 font-medium text-sm text-danger">
      <X aria-hidden className="size-4" />
      {rating ? 'Pas tout à fait' : 'Non noté'} : il était{' '}
      {CLUE_RATING_LABELS[expected].toLowerCase()}
    </p>
  );
}
