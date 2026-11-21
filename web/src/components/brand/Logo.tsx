import { cn } from '@/lib/utils';

// La marque MindStack : trois couches empilées, celle du dessus en rouge. Une information se lit
// couche par couche (le fil, l'enquête, le tribunal) avant qu'on la croie.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden
      className={cn('size-7 shrink-0 text-primary', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M16 15.5 28.5 21.75 16 28 3.5 21.75Z" fill="currentColor" opacity="0.28" />
      <path d="M16 10 28.5 16.25 16 22.5 3.5 16.25Z" fill="currentColor" opacity="0.55" />
      <path d="M16 4 28.5 10.25 16 16.5 3.5 10.25Z" fill="currentColor" />
    </svg>
  );
}

export function Logo({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="display text-[1.15rem] leading-none tracking-[-0.03em]">{name}</span>
    </span>
  );
}
