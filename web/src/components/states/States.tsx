import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// États communs d'une page ou d'une liste : vide, chargement, erreur. Jamais de détail technique.
// Une page vide invite à agir ; une erreur dit ce qui s'est passé et quoi faire.

type StateProps = { title: string; description?: ReactNode; action?: ReactNode };

function StateBox({ title, description, action, role }: StateProps & { role?: 'alert' }) {
  return (
    <div
      role={role}
      className={cn(
        'flex flex-col items-center gap-2 rounded-[20px] border border-dashed px-6 py-10 text-center',
        role === 'alert'
          ? 'border-danger/50 bg-danger-soft text-danger'
          : 'border-input bg-card text-foreground',
      )}
    >
      <p className="font-bold">{title}</p>
      {description && (
        <p
          className={cn(
            'max-w-prose text-sm',
            role === 'alert' ? 'text-danger' : 'text-muted-foreground',
          )}
        >
          {description}
        </p>
      )}
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
