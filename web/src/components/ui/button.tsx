import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type * as React from 'react';
import { cn } from '@/lib/utils';

// Boutons « Nuit rouge » : des pilules qui s'enfoncent légèrement au clic, sans lueur. Le rouge
// porte l'action principale d'un écran ; « solid » (clair sur nuit) est réservé à l'accueil.
const buttonVariants = cva(
  "group/button inline-flex max-w-full shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-center text-sm font-medium transition-[transform,background-color,color,box-shadow,border-color] duration-200 ease-out-strong outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/40 active:not-aria-[haspopup]:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-[inset_0_1px_0_oklch(1_0_0/18%),0_8px_24px_-12px_var(--glow)] hover:bg-[color-mix(in_oklch,var(--primary),white_10%)]',
        solid:
          'bg-foreground text-background shadow-[inset_0_-1px_0_oklch(0_0_0/14%)] hover:bg-[color-mix(in_oklch,var(--foreground),white_8%)]',
        outline:
          'border-input bg-transparent hover:border-[color-mix(in_oklch,var(--foreground)_22%,transparent)] hover:bg-foreground/[0.04] aria-expanded:bg-foreground/[0.06]',
        secondary:
          'bg-foreground/[0.06] text-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--foreground)_8%,transparent)] hover:bg-foreground/[0.1] aria-expanded:bg-foreground/[0.1]',
        ghost:
          'text-foreground/85 hover:bg-foreground/[0.06] hover:text-foreground aria-expanded:bg-foreground/[0.06]',
        destructive:
          'bg-destructive/12 text-destructive hover:bg-destructive/20 focus-visible:ring-destructive/25',
        link: 'rounded-none px-0 text-primary underline-offset-4 hover:underline active:not-aria-[haspopup]:scale-100',
      },
      size: {
        default:
          'min-h-9 gap-2 px-4 py-1.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
        xs: "min-h-6 gap-1 px-2.5 py-0.5 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "min-h-8 gap-1.5 px-3.5 py-1 text-[0.8rem] [&_svg:not([class*='size-'])]:size-3.5",
        lg: 'min-h-11 gap-2 px-5 py-2 text-[0.95rem] has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4',
        icon: 'size-9',
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
