import { CircleCheck, Gavel, Waypoints } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { publicEnv } from '@/lib/env';

// Cadre des pages de compte : le formulaire à gauche, la promesse du produit à droite (grand écran).
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col px-6 py-6 sm:px-10">
        <Link href="/" className="flex items-center gap-2.5 self-start font-semibold text-lg">
          <span
            aria-hidden
            className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm"
          >
            {publicEnv.NEXT_PUBLIC_APP_NAME.charAt(0)}
          </span>
          {publicEnv.NEXT_PUBLIC_APP_NAME}
        </Link>
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          {children}
        </main>
      </div>
      <aside className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <p className="max-w-md text-balance font-semibold text-3xl leading-tight">
          Avant de partager, regardez d’où vient l’information.
        </p>
        <ul className="grid max-w-md gap-5 text-primary-foreground/90">
          <li className="flex gap-3">
            <Waypoints aria-hidden className="mt-0.5 size-5 shrink-0" />
            <span>
              L’histoire d’une information, version par version, avec ses sources et ses dates.
            </span>
          </li>
          <li className="flex gap-3">
            <Gavel aria-hidden className="mt-0.5 size-5 shrink-0" />
            <span>Deux IA plaident, vous votez, le juge conclut à partir des seules pièces.</span>
          </li>
          <li className="flex gap-3">
            <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0" />
            <span>
              « Informations insuffisantes » quand les preuves manquent. Jamais de verdict inventé.
            </span>
          </li>
        </ul>
        <p className="text-primary-foreground/75 text-sm">
          Équipe MindStack, DevFest Antananarivo 2026
        </p>
      </aside>
    </div>
  );
}
