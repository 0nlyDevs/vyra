'use client';

import { Leaf, LogOut, Monitor, Moon, Palette, Sun } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useTransition } from 'react';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { READING_LABELS, useReadingPreferences } from './ReadingControls';

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

/**
 * L'avatar, en haut à droite : qui est connecté, le kit d'interface, le thème, la taille du texte
 * et le mode éco (le seul endroit pour les régler sur un téléphone), puis la déconnexion.
 * `signOutAction` est la server action de déconnexion, passée par la coquille.
 */
export function UserMenu({
  name,
  role,
  kitHref,
  signOutAction,
}: {
  name: string;
  role: string;
  kitHref?: string;
  signOutAction: () => Promise<void>;
}) {
  const { theme, setTheme } = useTheme();
  const { eco, canShrink, canGrow, changeSize, toggleEco } = useReadingPreferences();
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="bar-avatar" aria-label={`Votre compte : ${name}`}>
        {initials(name)}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-64 p-1.5">
        <DropdownMenuLabel className="grid gap-0.5 px-2.5 py-2 font-normal">
          <span className="truncate font-bold text-foreground">{name}</span>
          <span className="truncate text-muted-foreground text-sm">{role}</span>
        </DropdownMenuLabel>
        {kitHref && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="min-h-10 px-2.5">
              <Link href={kitHref}>
                <Palette aria-hidden /> Kit d’interface
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="px-2.5 text-muted-foreground text-xs">
          Thème
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light" className="min-h-10">
            <Sun aria-hidden /> Clair
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark" className="min-h-10">
            <Moon aria-hidden /> Sombre
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system" className="min-h-10">
            <Monitor aria-hidden /> Comme l’appareil
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
          <span className="text-sm">Taille du texte</span>
          <span className="site-round-group">
            <button
              type="button"
              className="site-round"
              aria-label={READING_LABELS.smaller}
              disabled={!canShrink}
              onClick={() => changeSize(-1)}
            >
              A−
            </button>
            <button
              type="button"
              className="site-round"
              aria-label={READING_LABELS.larger}
              disabled={!canGrow}
              onClick={() => changeSize(1)}
            >
              A+
            </button>
          </span>
        </div>
        <DropdownMenuCheckboxItem
          checked={eco}
          onCheckedChange={toggleEco}
          onSelect={(event) => event.preventDefault()}
          className="min-h-10"
        >
          <Leaf aria-hidden /> {READING_LABELS.eco}
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="min-h-10 px-2.5"
          disabled={pending}
          onSelect={() => startTransition(() => signOutAction())}
        >
          <LogOut aria-hidden /> {pending ? 'Déconnexion…' : 'Se déconnecter'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
