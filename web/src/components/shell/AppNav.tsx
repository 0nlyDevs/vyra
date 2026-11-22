'use client';

import { ChevronDown, Ellipsis } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type NavItem, TAB_ITEMS } from '@/lib/navigation';
import { foldTabs } from '@/lib/priority-nav';
import { useSlidingPill } from '@/lib/use-sliding-pill';

// Navigation de l'espace connecté : l'île d'encre au centre de la barre, avec sa pilule papier
// sous l'onglet en cours ; sous 640 px, la barre d'encre au pouce. Les entrées viennent de
// src/lib/navigation.ts.

const MORE = 'Plus';
const MORE_LABEL = 'Autres pages';

/** L'onglet allumé : la page elle-même, ou une page en dessous. */
function useActive(items: NavItem[]) {
  const pathname = usePathname();
  return items.findIndex((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}

/**
 * L'île d'onglets. Priorité + : les onglets qui ne tiennent pas se replient dans « Plus » en
 * partant de la fin ; un onglet en cours replié donne son nom et la pilule à « Plus ». Une rangée
 * cachée mesure chaque onglet, pour que le repli ne devine jamais.
 */
/** Largeur occupée par le contenu d'un côté de la barre (ses enfants, de bord à bord). */
function contentWidth(side: Element | null): number {
  const boxes = Array.from(side?.children ?? [])
    .map((child) => child.getBoundingClientRect())
    .filter((box) => box.width > 0);
  if (!boxes.length) return 0;
  return Math.max(...boxes.map((b) => b.right)) - Math.min(...boxes.map((b) => b.left));
}

export function TabIsland({ items = TAB_ITEMS }: { items?: NavItem[] }) {
  const active = useActive(items);
  const wrap = useRef<HTMLDivElement>(null);
  const ghost = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(items.length);
  const { host: island, pill, place, handlers } = useSlidingPill<HTMLUListElement>(active);

  const fit = useCallback(() => {
    const cells = ghost.current ? (Array.from(ghost.current.children) as HTMLElement[]) : [];
    if (!wrap.current || cells.length < items.length + 1) return;
    const gap = 2;
    const widths = cells.slice(0, items.length).map((c) => c.offsetWidth + gap);
    // La colonne du milieu prend la largeur de l'île dépliée : elle ne rétrécit que si l'écran
    // manque de place, et la mesure ci-dessous reste la vraie place disponible.
    const full = widths.reduce((sum, width) => sum + width, 10);
    wrap.current.style.setProperty('--tabs-full', `${Math.ceil(full)}px`);
    // Les deux côtés de la barre prennent la largeur du plus large : l'île reste au centre.
    const bar = wrap.current.parentElement;
    const sides = [wrap.current.previousElementSibling, wrap.current.nextElementSibling];
    bar?.style.setProperty('--bar-side', `${Math.ceil(Math.max(...sides.map(contentWidth)))}px`);
    const room = wrap.current.clientWidth;
    if (!room) return;
    const plain = cells[items.length].offsetWidth + gap;
    // Le retrait de l'île (5 px de chaque côté) n'est pas de la place pour les onglets.
    let fold = foldTabs(widths, room - 10, plain, active);
    if (fold.activeFolded && cells[items.length + 1]) {
      // « Plus » porte alors le nom de l'onglet en cours : on mesure ce libellé-là.
      fold = foldTabs(widths, room - 10, cells[items.length + 1].offsetWidth + gap, active);
    }
    setVisible(fold.visible);
    place();
  }, [items.length, active, place]);

  useLayoutEffect(() => {
    fit();
    const ro = new ResizeObserver(fit);
    if (wrap.current) ro.observe(wrap.current);
    // Un côté qui change (bouton de démo, avatar) change aussi la place de l'île.
    for (const side of [wrap.current?.previousElementSibling, wrap.current?.nextElementSibling]) {
      for (const child of Array.from(side?.children ?? [])) ro.observe(child);
    }
    document.fonts?.ready.then(fit);
    return () => ro.disconnect();
  }, [fit]);

  // Le repli déplace les onglets (et peut-être l'onglet en cours dans « Plus ») : la pilule suit.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `visible` déclenche le placement.
  useLayoutEffect(() => place(), [visible, place]);

  const folded = items.slice(visible);
  const holds = active >= visible;
  const current = active >= 0 ? items[active] : undefined;
  const HeldIcon = current?.icon;

  return (
    <div ref={wrap} className="tab-wrap">
      <nav aria-label="Navigation principale" className="tab-island">
        <span ref={pill} className="tab-pill" aria-hidden />
        <ul ref={island} className="tab-list" {...handlers}>
          {items.slice(0, visible).map(({ label, icon: Icon, href }, i) => (
            <li key={href}>
              <Link
                href={href}
                className="tab"
                data-pill-item
                data-current={i === active || undefined}
                aria-current={i === active ? 'page' : undefined}
              >
                <Icon className="tab-icon" aria-hidden />
                {label}
              </Link>
            </li>
          ))}
          {folded.length > 0 && (
            <li>
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="tab"
                  data-pill-item
                  data-current={holds || undefined}
                  aria-label={holds && current ? `${current.label}, ${MORE}` : undefined}
                >
                  {holds && HeldIcon ? <HeldIcon className="tab-icon" aria-hidden /> : null}
                  {holds && current ? current.label : MORE}
                  <ChevronDown className="tab-caret" aria-hidden />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={10}
                  className="tab-menu"
                  aria-label={MORE_LABEL}
                >
                  {folded.map(({ label, icon: Icon, href }, i) => (
                    <DropdownMenuItem key={href} asChild>
                      <Link href={href} aria-current={visible + i === active ? 'page' : undefined}>
                        <Icon aria-hidden />
                        {label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          )}
        </ul>
      </nav>
      {/* La rangée de mesure : chaque onglet, « Plus », et « Plus » portant l'onglet en cours. */}
      <div ref={ghost} className="tab-ghost" aria-hidden inert>
        {items.map(({ label, icon: Icon, href }) => (
          <span key={href} className="tab">
            <Icon className="tab-icon" />
            {label}
          </span>
        ))}
        <span className="tab">
          {MORE}
          <ChevronDown className="tab-caret" />
        </span>
        {current && HeldIcon && (
          <span className="tab">
            <HeldIcon className="tab-icon" />
            {current.label}
            <ChevronDown className="tab-caret" />
          </span>
        )}
      </div>
    </div>
  );
}

/** Sous 640 px, l'île devient la barre d'encre au pouce : quatre entrées, puis « Plus ». */
export function TabBar({ items = TAB_ITEMS }: { items?: NavItem[] }) {
  const active = useActive(items);
  const room = items.length > 5 ? 4 : items.length;
  const folded = items.slice(room);
  const holds = active >= room;
  const current = active >= 0 ? items[active] : undefined;
  return (
    <nav aria-label="Navigation principale" className="tab-bar">
      <ul
        style={{
          gridTemplateColumns: `repeat(${room + (folded.length ? 1 : 0)}, minmax(0, 1fr))`,
        }}
      >
        {items.slice(0, room).map(({ label, short, icon: Icon, href }, i) => (
          <li key={href}>
            <Link
              href={href}
              className="tab-bar-item"
              aria-current={i === active ? 'page' : undefined}
            >
              <Icon className="size-[22px]" aria-hidden />
              <span>{short ?? label}</span>
            </Link>
          </li>
        ))}
        {folded.length > 0 && (
          <li>
            <DropdownMenu>
              <DropdownMenuTrigger className="tab-bar-item" data-current={holds || undefined}>
                {holds && current ? (
                  <current.icon className="size-[22px]" aria-hidden />
                ) : (
                  <Ellipsis className="size-[22px]" aria-hidden />
                )}
                <span>{holds && current ? (current.short ?? current.label) : MORE}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="end"
                sideOffset={10}
                className="tab-menu"
                aria-label={MORE_LABEL}
              >
                {folded.map(({ label, icon: Icon, href }, i) => (
                  <DropdownMenuItem key={href} asChild>
                    <Link href={href} aria-current={room + i === active ? 'page' : undefined}>
                      <Icon aria-hidden />
                      {label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        )}
      </ul>
    </nav>
  );
}
