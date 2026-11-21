import type { ReactNode } from 'react';

// En-tête de page : un sur-titre facultatif, le titre, une phrase, et les actions à droite.
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="grid min-w-0 gap-3">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="display text-[clamp(2.1rem,4.2vw,3.1rem)]">{title}</h1>
        {description && (
          <p className="max-w-[60ch] text-[1.02rem] text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
