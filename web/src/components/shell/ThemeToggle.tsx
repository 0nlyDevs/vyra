'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Passer du thème clair au thème sombre"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      <Sun aria-hidden className="dark:hidden" />
      <Moon aria-hidden className="hidden dark:block" />
    </Button>
  );
}
