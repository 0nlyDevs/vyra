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
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="grid min-w-0 gap-1.5">
        {eyebrow && <p className="font-medium text-primary text-sm">{eyebrow}</p>}
        <h1 className="font-semibold text-3xl">{title}</h1>
        {description && <p className="max-w-prose text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
