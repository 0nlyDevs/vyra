import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';

// La flèche dessinée à la main et sa note manuscrite : une par page, vers le geste à faire.
// Elle se trace une fois, puis la note monte. Masquées sous 1024 px et en mode éco.

/** La flèche : un trait qui boucle puis file vers sa pointe, tracé une fois à l'arrivée. */
export function Doodle({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 110 96" className={cn('doodle', className)} style={style} aria-hidden>
      <path
        pathLength={1}
        d="M4 70 C 22 72, 40 60, 44 42 C 48 22, 26 18, 24 34 C 22 52, 58 58, 76 66 C 92 74, 100 82, 106 92"
      />
      <path pathLength={1} d="M93 90 L107 93 L104 79" />
    </svg>
  );
}

/** La note écrite à côté de la flèche, dans l'italique des citations. */
export function DoodleNote({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <p className={cn('doodle-note', className)} style={style} aria-hidden>
      {children}
    </p>
  );
}
