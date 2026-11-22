'use client';

import { Children, type ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';

// Une longue liste ne se déroule pas d'un bloc : les premières lignes, puis « Afficher plus ». Les
// lignes sont préparées par le serveur ; seul le nombre de lignes montrées change ici.
export function ProgressiveList({
  children,
  initial = 12,
  step = 12,
}: {
  children: ReactNode;
  initial?: number;
  step?: number;
}) {
  const rows = Children.toArray(children);
  const [shown, setShown] = useState(initial);
  const remaining = rows.length - shown;
  return (
    <>
      <div>{rows.slice(0, shown)}</div>
      {remaining > 0 && (
        <Button
          type="button"
          variant="outline"
          className="justify-self-center"
          onClick={() => setShown((count) => count + step)}
        >
          Afficher {Math.min(step, remaining)} de plus
          <span className="text-muted-foreground tabular-nums">({remaining} restantes)</span>
        </Button>
      )}
    </>
  );
}
