'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import { HOME_ITEM, KIT_ITEM, MODULE_ITEMS, type NavItem } from '@/lib/navigation';
import { cn } from '@/lib/utils';

// Navigation de l'espace connecté : barre latérale sur PC, bandeau défilant sur petit écran.
// Les entrées viennent de src/lib/navigation.ts. L'entrée active porte un trait rouge à gauche.

function NavLink({ item, className }: { item: NavItem; className?: string }) {
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex items-center gap-3 rounded-full px-3.5 py-2 text-[0.9rem] outline-none transition-[background-color,color] duration-200 focus-visible:ring-3 focus-visible:ring-ring/40',
        active
          ? 'bg-sidebar-active font-medium text-sidebar-active-foreground shadow-[inset_0_1px_0_var(--sheen)]'
          : 'text-sidebar-foreground hover:bg-foreground/[0.05] hover:text-foreground',
        className,
      )}
    >
      {active && (
        <span
          aria-hidden
          className="absolute top-1/2 left-0 h-4 w-[3px] -translate-y-1/2 rounded-full bg-primary shadow-[0_0_12px_var(--glow)]"
        />
      )}
      <Icon aria-hidden className={cn('size-4 shrink-0', active && 'text-primary')} />
      {item.label}
    </Link>
  );
}

export function AppSidebar({ appName }: { appName: string }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-sidebar-border border-r bg-sidebar md:flex">
      <Link
        href="/dashboard"
        className="mx-3 mt-4 mb-2 flex items-center rounded-full px-3 py-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
      >
        <Logo name={appName} />
      </Link>
      <nav aria-label="Navigation principale" className="flex flex-1 flex-col gap-1 px-3 py-2">
        <NavLink item={HOME_ITEM} />
        <p className="px-3.5 pt-5 pb-1.5 font-medium text-[0.62rem] text-muted-foreground uppercase tracking-[0.24em]">
          Modules
        </p>
        {MODULE_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
        <div className="mt-auto grid gap-3 pb-4">
          <div className="mx-1 rounded-2xl bg-foreground/[0.035] p-3.5 shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--foreground)_6%,transparent)]">
            <p className="font-medium text-[0.8rem]">Non vérifié ≠ faux</p>
            <p className="mt-1 text-[0.75rem] text-muted-foreground leading-snug">
              MindStack montre les preuves. C’est vous qui jugez.
            </p>
          </div>
          <NavLink item={KIT_ITEM} />
        </div>
      </nav>
    </aside>
  );
}

export function AppTopNav() {
  return (
    <nav
      aria-label="Navigation principale"
      className="flex gap-1 overflow-x-auto border-sidebar-border border-b bg-sidebar px-3 py-2 md:hidden"
    >
      {[HOME_ITEM, ...MODULE_ITEMS, KIT_ITEM].map((item) => (
        <NavLink key={item.href} item={item} className="shrink-0" />
      ))}
    </nav>
  );
}
