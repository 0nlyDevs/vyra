import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type * as React from 'react';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  // Hauteur minimale et retour à la ligne (F44) : un libellé long ou agrandi n'est jamais rogné.
  'group/badge inline-flex min-h-5 w-fit max-w-full items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3! [&>svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-tag-inverted text-tag-inverted-foreground [a]:hover:bg-primary-hover',
        secondary: 'bg-secondary text-secondary-foreground [a]:hover:bg-active',
        destructive: 'bg-danger-soft text-danger focus-visible:ring-destructive/20',
        outline: 'border-input text-foreground [a]:hover:bg-raised [a]:hover:text-foreground',
        ghost: 'hover:bg-raised hover:text-foreground',
        link: 'text-foreground underline-offset-4 hover:underline',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Badge({
  className,
  variant = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'span';

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
