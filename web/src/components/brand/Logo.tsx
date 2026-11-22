import { cn } from '@/lib/utils';

// La marque, en encre et papier : un « V. » papier sur une tuile d'encre (l'initiale et son
// point), puis le nom en Bricolage très gras, son point en Cormorant italique. La tuile s'inverse
// en sombre : elle reste lisible sur les deux fonds.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden
      className={cn('size-7 shrink-0 text-foreground', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="64" height="64" rx="14" fill="currentColor" />
      <path
        d="M17 19 30 45 43 19"
        fill="none"
        className="stroke-background"
        strokeWidth="7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="48" cy="43" r="4.6" className="fill-background" />
    </svg>
  );
}

export function Logo({
  name,
  className,
  mark = true,
}: {
  name: string;
  className?: string;
  mark?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      {mark && <LogoMark />}
      <span className="font-display font-extrabold text-xl leading-none tracking-[-0.04em]">
        {name}
        <em className="quote font-medium" aria-hidden>
          .
        </em>
      </span>
    </span>
  );
}
