import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// La ligne numérotée (audience du tribunal, partie du détective, scan…) :
// en attente = disque cerclé, en cours = disque d'encre qui respire, fait = disque d'encre et une
// coche papier. `current` commence à 0.
export function Steps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li
            key={step}
            className="flex items-center gap-2"
            aria-current={active ? 'step' : undefined}
          >
            <span
              className={cn(
                'grid size-8 shrink-0 place-items-center rounded-full font-bold font-display text-[0.72rem] tabular-nums',
                done && 'bg-foreground text-background',
                active && 'step-active bg-primary text-primary-foreground',
                !done && !active && 'border border-input bg-card text-muted-foreground',
              )}
            >
              {done ? <Check aria-hidden className="size-4" /> : String(index + 1).padStart(2, '0')}
            </span>
            <span
              className={cn(
                'text-sm',
                active ? 'font-bold' : done ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {step}
            </span>
            {index < steps.length - 1 && (
              <span aria-hidden className={cn('h-px w-6', done ? 'bg-foreground' : 'bg-border')} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
