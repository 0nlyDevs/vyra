import type * as React from 'react';
import { cn } from '@/lib/utils';

// Zone de texte « encre et papier » : le rayon des cartes, filet de contrôle, fond de carte.
function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex field-sizing-content min-h-24 w-full rounded-[20px] border border-input bg-card px-4 py-3 text-base text-foreground transition-[border-color,box-shadow,background-color] duration-200 outline-none placeholder:text-muted-foreground hover:border-foreground/50 focus-visible:border-foreground focus-visible:ring-3 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:bg-raised disabled:text-muted-foreground aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
