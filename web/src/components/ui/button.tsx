import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type * as React from 'react';
import { cn } from '@/lib/utils';

// Boutons « encre et papier » : des pilules. `default` (l'encre, papier en sombre) porte l'action
// principale d'un écran, une seule par écran ; le survol éclaircit l'encre, le libellé ne change
// pas. `outline` (filet), `secondary` (fond relevé), `ghost` (texte seul) pour le reste.
// « solid » (clair sur nuit) est réservé à l'accueil. Désactivé : texte discret, jamais d'opacité.
const buttonVariants = cva(
  "group/button inline-flex max-w-full shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-center text-sm font-medium transition-[transform,background-color,color,box-shadow,border-color] duration-200 ease-out-strong outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/40 active:not-aria-[haspopup]:scale-[0.97] disabled:pointer-events-none aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          'bg-primary font-semibold text-primary-foreground hover:bg-primary-hover hover:text-primary-foreground disabled:bg-raised disabled:text-muted-foreground',
        solid:
          'bg-foreground text-background shadow-[inset_0_-1px_0_oklch(0_0_0/14%)] hover:bg-[color-mix(in_oklch,var(--foreground),white_8%)] disabled:opacity-50',
        outline:
          'border-input bg-transparent text-foreground hover:border-foreground hover:bg-raised hover:text-foreground aria-expanded:border-foreground aria-expanded:bg-raised disabled:border-border disabled:text-muted-foreground',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-active hover:text-secondary-foreground aria-expanded:bg-active disabled:text-muted-foreground',
        ghost:
          'text-foreground hover:bg-raised hover:text-foreground aria-expanded:bg-raised disabled:text-muted-foreground',
        destructive:
          'bg-danger-soft text-danger hover:bg-[color-mix(in_oklch,var(--danger-soft),var(--danger)_12%)] hover:text-danger focus-visible:ring-destructive/25 disabled:text-muted-foreground',
        link: 'rounded-none px-0 text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground active:not-aria-[haspopup]:scale-100 disabled:text-muted-foreground',
      },
      size: {
        default:
          'min-h-10 gap-2 px-4 py-1.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
        xs: "min-h-6 gap-1 px-2.5 py-0.5 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "min-h-8 gap-1.5 px-3.5 py-1 text-[0.8rem] [&_svg:not([class*='size-'])]:size-3.5",
        lg: 'min-h-11 gap-2 px-5 py-2 text-[0.95rem] has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4',
        xl: "min-h-13 gap-2 px-6 py-2 text-base [&_svg:not([class*='size-'])]:size-5",
        icon: 'size-10',
        'icon-xs': "size-6 [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-8',
        'icon-lg': 'size-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
