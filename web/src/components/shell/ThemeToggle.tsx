'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

/** Passe du clair au sombre à partir de ce que la page montre (la classe écrite par next-themes). */
export function useThemeFlip() {
  const { setTheme } = useTheme();
  return () => setTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark');
}

/**
 * Le visage du bouton suit la classe de la page en CSS : le serveur et le premier affichage sont
 * d'accord. Une lune et « Thème sombre » en clair, un soleil et « Thème clair » en sombre.
 */
export function ThemeFace({ flag = false }: { flag?: boolean }) {
  return (
    <>
      <Moon className="dock-icon dark:hidden" aria-hidden />
      <Sun className="dock-icon hidden dark:block" aria-hidden />
      <span className={flag ? 'dock-flag dark:hidden' : 'sr-only dark:hidden'}>
        Passer au thème sombre
      </span>
      <span className={flag ? 'dock-flag hidden dark:block' : 'sr-only hidden dark:block'}>
        Passer au thème clair
      </span>
    </>
  );
}

/** Le bouton rond du thème (barre publique, pages de compte). */
export function ThemeToggle({ className }: { className?: string }) {
  const flip = useThemeFlip();
  return (
    <button type="button" className={cn('site-round', className)} onClick={flip}>
      <ThemeFace />
    </button>
  );
}
