'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HOME_ITEM, KIT_ITEM, MODULE_ITEMS, type NavItem } from '@/lib/navigation';
import { cn } from '@/lib/utils';

// Navigation de l'espace connecté : barre latérale sur PC, bandeau défilant sur petit écran.
// Les entrées viennent de src/lib/navigation.ts.

function NavLink({ item, className }: { item: NavItem; className?: string }) {
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
        active
          ? 'bg-sidebar-active font-medium text-sidebar-active-foreground'
          : 'text-sidebar-foreground hover:bg-muted hover:text-foreground',
        className,
      )}
    >
      <Icon aria-hidden className="size-4 shrink-0" />
      {item.label}
    </Link>
  );
}

export function AppSidebar({ appName }: { appName: string }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-sidebar-border border-r bg-sidebar md:flex">
      <Link href="/dashboard" className="flex items-center gap-2.5 px-5 py-4 font-semibold text-lg">
        <span
          aria-hidden
          className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm"
        >
          {appName.charAt(0)}
        </span>
        {appName}
      </Link>
      <nav aria-label="Navigation principale" className="flex flex-1 flex-col gap-1 px-3 py-2">
        <NavLink item={HOME_ITEM} />
        <p className="px-3 pt-4 pb-1 font-medium text-muted-foreground text-xs">Modules</p>
        {MODULE_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
        <div className="mt-auto pb-3">
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
