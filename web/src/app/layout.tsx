import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { publicEnv } from '@/lib/env';
import './globals.css';

export const metadata: Metadata = {
  title: publicEnv.NEXT_PUBLIC_APP_NAME,
  description: 'Projet de l’équipe MindStack au hackathon DevFest Antananarivo 2026.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
