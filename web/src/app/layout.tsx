import { Analytics } from '@vercel/analytics/next';
import { GeistMono } from 'geist/font/mono';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { READING_PREFERENCES_SCRIPT } from '@/components/shell/ReadingControls';
import { RippleListener } from '@/components/shell/Ripple';
import { ScrollState } from '@/components/shell/ScrollState';
import { ThemeProvider } from '@/components/shell/ThemeProvider';
import { Toaster } from '@/components/ui/sonner';
import { publicEnv } from '@/lib/env';
import '@fontsource-variable/bricolage-grotesque/opsz.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import './globals.css';

export const metadata: Metadata = {
  // Chaque page donne son nom ; l'onglet du navigateur affiche « Enquêtes · Vyra ».
  title: {
    default: publicEnv.NEXT_PUBLIC_APP_NAME,
    template: `%s · ${publicEnv.NEXT_PUBLIC_APP_NAME}`,
  },
  description:
    'Vyra : voir d’où vient une information et la faire juger sur pièces. DevFest Antananarivo 2026.',
};

// Les polices sont dans le dépôt (paquet `geist`) : elles s'affichent même sans wifi.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={GeistMono.variable} suppressHydrationWarning>
      <head>
        {/* Taille du texte et mode éco gardés sur l'appareil, appliqués avant l'affichage. */}
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: script fixe, écrit dans le code, sans donnée venue de l'utilisateur. */}
        <script dangerouslySetInnerHTML={{ __html: READING_PREFERENCES_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>
          {children}
          <Toaster position="bottom-center" />
          <RippleListener />
          <ScrollState />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
