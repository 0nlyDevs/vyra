'use client';

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

// Le toast « encre et papier » : une pilule d'encre (papier en sombre), avec son propre texte.
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--toast)',
          '--normal-text': 'var(--toast-foreground)',
          '--normal-border': 'var(--toast)',
          '--success-bg': 'var(--toast)',
          '--success-text': 'var(--toast-foreground)',
          '--success-border': 'var(--toast)',
          '--error-bg': 'var(--toast)',
          '--error-text': 'var(--toast-foreground)',
          '--error-border': 'var(--toast)',
          '--border-radius': '18px',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'cn-toast',
          description: '!text-current',
          actionButton:
            '!h-[34px] !rounded-full !border !border-current !bg-transparent !px-3.5 !font-medium !text-current hover:!bg-transparent',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
