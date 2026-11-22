'use client';

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

const ITEM = '[data-pill-item]';

/** Marque l'entrée dont le libellé se lit sur la pilule (`data-lit`), ou aucune. */
function light(host: HTMLElement | null, lit: HTMLElement | null) {
  for (const item of host?.querySelectorAll<HTMLElement>(ITEM) ?? []) {
    item.toggleAttribute('data-lit', item === lit);
  }
}

/** Le bord gauche d'un élément dans `ancestor` (le parent de la pilule), à travers ses parents. */
function leftWithin(el: HTMLElement, ancestor: Element | null): number {
  let x = 0;
  let node: HTMLElement | null = el;
  while (node && node !== ancestor) {
    x += node.offsetLeft;
    node = node.offsetParent as HTMLElement | null;
  }
  return x;
}

/**
 * La pilule qui glisse sous une rangée d'entrées : l'île d'onglets, la barre publique, les portes
 * de connexion. Elle repose sous l'entrée en cours (`data-current`), suit le pointeur et le
 * clavier sur une autre entrée (`data-pill-item`), et revient quand ils partent.
 *
 * Elle glisse (transition CSS sur transform et width) vers une autre entrée, et se place d'un
 * coup quand sa propre entrée bouge (premier affichage, polices, redimensionnement). Pendant le
 * glissement, seule l'entrée sous son centre est allumée : un libellé ne passe jamais à l'encre
 * sur l'île d'encre avant l'arrivée de la pilule. `key` change avec l'entrée en cours.
 */
export function useSlidingPill<H extends HTMLElement = HTMLElement>(key: unknown) {
  const host = useRef<H>(null);
  const pill = useRef<HTMLSpanElement>(null);
  // L'entrée sous le pointeur ou le clavier, quand ce n'est pas l'entrée en cours.
  const target = useRef<HTMLElement | null>(null);
  // Où la pilule a été posée la dernière fois, et sous quelle entrée.
  const last = useRef<{ el: HTMLElement; x: number; w: number } | null>(null);
  // L'image qui garde le libellé allumé sous la pilule en mouvement (0 au repos).
  const follow = useRef(0);
  useEffect(() => () => cancelAnimationFrame(follow.current), []);

  const place = useCallback(() => {
    const list = host.current;
    const p = pill.current;
    if (!list || !p) return;
    const hovered = target.current && list.contains(target.current) ? target.current : null;
    const el = hovered ?? list.querySelector<HTMLElement>(`${ITEM}[data-current]`);
    if (!el) {
      p.style.opacity = '0';
      last.current = null;
      cancelAnimationFrame(follow.current);
      follow.current = 0;
      light(list, null);
      return;
    }
    const x = leftWithin(el, p.offsetParent);
    const w = el.offsetWidth;
    const prev = last.current;
    if (prev && prev.el === el && prev.x === x && prev.w === w) {
      if (!follow.current) light(list, el);
      return;
    }
    const instant = !prev || prev.el === el;
    if (instant) p.style.transition = 'none';
    p.style.opacity = '1';
    p.style.width = `${w}px`;
    p.style.transform = `translateX(${x}px)`;
    cancelAnimationFrame(follow.current);
    follow.current = 0;
    if (instant) {
      void p.offsetWidth;
      p.style.transition = '';
      light(list, el);
    } else {
      const step = () => {
        const r = p.getBoundingClientRect();
        if (p.getAnimations().length) {
          const under = Array.from(list.querySelectorAll<HTMLElement>(ITEM)).find((item) => {
            const c = item.getBoundingClientRect();
            return r.left <= c.left + c.width / 2 && c.left + c.width / 2 <= r.right;
          });
          light(list, under ?? null);
          follow.current = requestAnimationFrame(step);
        } else {
          light(list, el);
          follow.current = 0;
        }
      };
      follow.current = requestAnimationFrame(step);
    }
    last.current = { el, x, w };
    // Désormais la pilule porte l'entrée en cours ; avant, l'entrée peint son propre fond.
    p.parentElement?.setAttribute('data-pill', '');
  }, []);

  // L'entrée en cours a changé (une page, un choix) : la pilule y va.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` déclenche le placement.
  useLayoutEffect(place, [key, place]);

  // Les polices et les redimensionnements déplacent les entrées sous une pilule au repos.
  useLayoutEffect(() => {
    const list = host.current;
    if (!list) return;
    const ro = new ResizeObserver(() => place());
    ro.observe(list);
    document.fonts?.ready.then(() => place());
    return () => ro.disconnect();
  }, [place]);

  const go = useCallback(
    (el: HTMLElement | null) => {
      if (target.current === el) return;
      target.current = el;
      place();
    },
    [place],
  );

  const handlers = {
    // Un doigt n'a pas de survol : un toucher déplace la pilule par la nouvelle entrée en cours.
    onPointerOver: (e: React.PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const item = (e.target as Element).closest<HTMLElement>(ITEM);
      if (item && host.current?.contains(item)) go(item);
    },
    onPointerLeave: (e: React.PointerEvent) => {
      if (e.pointerType !== 'touch') go(null);
    },
    // Seul le focus clavier déplace la pilule : un clic met le focus sur l'entrée déjà dessous.
    onFocus: (e: React.FocusEvent) => {
      const item = (e.target as Element).closest<HTMLElement>(ITEM);
      if (item && (e.target as Element).matches(':focus-visible')) go(item);
    },
    onBlur: (e: React.FocusEvent) => {
      if (!host.current?.contains(e.relatedTarget as Node | null)) go(null);
    },
  };

  return { host, pill, place, handlers };
}
