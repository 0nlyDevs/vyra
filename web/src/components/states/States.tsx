import type { ReactNode } from 'react';

// États communs d'une page ou d'une liste : vide, chargement, erreur. Jamais de détail technique.

type StateProps = { title: string; description?: ReactNode; action?: ReactNode };

function StateBox({ title, description, action, role }: StateProps & { role?: 'alert' }) {
  return (
    <div
      role={role}
      className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center"
    >
      <p className="font-medium">{title}</p>
      {description && <p className="max-w-prose text-muted-foreground text-sm">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function EmptyState(props: StateProps) {
  return <StateBox {...props} />;
}

export function ErrorState({
  title = 'Un problème est survenu.',
  description = 'Réessayez dans un instant.',
  action,
}: Partial<StateProps>) {
  return <StateBox role="alert" title={title} description={description} action={action} />;
}

export function LoadingState({ title = 'Chargement…' }: { title?: string }) {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-3 py-10 text-muted-foreground"
    >
      <span
        aria-hidden
        className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      />
      <span className="text-sm">{title}</span>
    </div>
  );
}
