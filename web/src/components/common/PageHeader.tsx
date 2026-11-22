import type { ReactNode } from 'react';

// En-tête de page : le titre (Bricolage très gras), une ligne de
// précision dessous (`eyebrow`), une phrase, les actions à droite, puis un seul filet d'encre.
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
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-foreground border-b pb-5">
      <div className="grid min-w-0 gap-2">
        <h1 className="page-title">{title}</h1>
        {eyebrow && <p className="font-semibold text-foreground text-sm">{eyebrow}</p>}
        {description && (
          <p className="max-w-[62ch] text-pretty text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
