'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';

// Thème nuit par défaut (direction « Nuit rouge ») ; le bouton de l'en-tête passe en clair.
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      // Nouvelle clé : l'ancien choix « clair » (défaut d'avant la refonte) ne s'applique plus,
      // tout le monde redémarre en nuit et peut repasser en clair avec le bouton.
      storageKey="mindstack-theme"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
