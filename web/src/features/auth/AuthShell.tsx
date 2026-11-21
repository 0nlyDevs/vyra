import { CircleCheck, Gavel, Waypoints } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from '@/components/brand/Logo';
import { publicEnv } from '@/lib/env';

// Cadre des pages de compte, toujours en thème nuit : le formulaire à gauche ; à droite (grand
// écran), la personne au casque de l'accueil, dans sa lueur rouge, et la promesse du produit.
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="dark grid min-h-[100dvh] bg-background text-foreground lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col px-6 py-6 sm:px-10">
        <Link
          href="/"
          className="self-start rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <Logo name={publicEnv.NEXT_PUBLIC_APP_NAME} />
        </Link>
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          {children}
        </main>
      </div>
      <aside className="relative isolate m-3 hidden overflow-hidden rounded-[2rem] bg-[oklch(0.115_0.012_22)] shadow-[inset_0_0_0_1px_oklch(1_0_0/7%)] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="hero-glow absolute bottom-[-30%] left-1/2 -z-10 aspect-square w-[130%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,oklch(0.6_0.23_24/0.55),oklch(0.45_0.18_24/0.2)_50%,transparent)]"
        />
        <Image
          src="/landing/casque.webp"
          alt=""
          width={1380}
          height={1845}
          sizes="40vw"
          priority
          className="hero-figure absolute right-[-6%] bottom-0 -z-10 w-[72%] [filter:hue-rotate(100deg)_saturate(1.2)]"
        />
        <div className="grid gap-4">
          <p className="eyebrow">Vérifier avant de croire</p>
          <p className="display max-w-md text-[2.4rem]">
            Avant de partager, regardez d’où vient l’information.
          </p>
        </div>
        <ul className="glass grid max-w-sm gap-4 rounded-3xl p-6 text-[0.95rem] text-foreground/90">
          <li className="flex gap-3">
            <Waypoints aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
            <span>L’histoire d’une information, version par version, avec ses sources.</span>
          </li>
          <li className="flex gap-3">
            <Gavel aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
            <span>Deux IA plaident, vous votez, le juge conclut sur pièces.</span>
          </li>
          <li className="flex gap-3">
            <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
            <span>« Informations insuffisantes » quand les preuves manquent.</span>
          </li>
        </ul>
      </aside>
    </div>
  );
}
