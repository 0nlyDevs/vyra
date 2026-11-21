import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// Fil d'étapes (audience du tribunal, partie du détective, scan…). `current` commence à 0.
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
                'flex size-7 shrink-0 items-center justify-center rounded-full border font-medium text-xs tabular-nums',
                done && 'border-primary bg-primary text-primary-foreground',
                active && 'border-primary text-primary',
                !done && !active && 'text-muted-foreground',
              )}
            >
              {done ? <Check aria-hidden className="size-3.5" /> : index + 1}
            </span>
            <span className={cn('text-sm', active ? 'font-medium' : 'text-muted-foreground')}>
              {step}
            </span>
            {index < steps.length - 1 && <span aria-hidden className="h-px w-6 bg-border" />}
          </li>
        );
      })}
    </ol>
  );
}
