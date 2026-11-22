'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';

// Encre et papier : le thème suit celui de l'appareil ; le clair et le sombre restent au choix
// (préférences en bas à gauche, menu de l'avatar). L'accueil reste en nuit quoi qu'il arrive.
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      // Nouvelle clé : l'ancien choix « nuit » imposé par la refonte précédente ne s'applique plus.
      storageKey="vyra-theme"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
