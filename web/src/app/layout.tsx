import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ThemeProvider } from '@/components/shell/ThemeProvider';
import { Toaster } from '@/components/ui/sonner';
import { publicEnv } from '@/lib/env';
import './globals.css';

export const metadata: Metadata = {
  title: publicEnv.NEXT_PUBLIC_APP_NAME,
  description: 'Projet de l’équipe MindStack au hackathon DevFest Antananarivo 2026.',
};

// Les polices sont dans le dépôt (paquet `geist`) : elles s'affichent même sans wifi.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="fr"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider>
          {children}
          <Toaster position="top-right" />
          <div className="grain" aria-hidden />
        </ThemeProvider>
      </body>
    </html>
  );
}
