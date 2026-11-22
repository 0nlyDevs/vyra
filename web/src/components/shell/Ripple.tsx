'use client';

import { useEffect } from 'react';

const PRESSABLE = '[data-slot="button"], [data-ripple]';

/**
 * L'onde à l'appui, pour les boutons, les onglets de l'île et l'avatar : un seul écouteur pour
 * toute la page. Un cercle de la couleur du texte du contrôle grandit et s'efface (650 ms).
 * Rien quand l'appareil demande moins d'animations, ni en mode éco.
 */
export function RippleListener() {
  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const press = (event: PointerEvent) => {
      if (reduce.matches || event.button !== 0) return;
      if (document.documentElement.dataset.eco === 'on') return;
      const el = (event.target as Element | null)?.closest<HTMLElement>(PRESSABLE);
      if (!el || el.matches(':disabled, [aria-disabled=true]')) return;
      const box = el.getBoundingClientRect();
      const size = Math.hypot(box.width, box.height) * 2;
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
      // Le cercle est rogné par son propre cadre : ce qui dépasse du contrôle n'est jamais coupé.
      const frame = document.createElement('span');
      frame.setAttribute('aria-hidden', 'true');
      frame.style.cssText =
        'position:absolute;inset:0;overflow:hidden;border-radius:inherit;pointer-events:none';
      const circle = document.createElement('span');
      circle.style.cssText =
        'position:absolute;border-radius:50%;background:currentColor;opacity:.24;transform:scale(0)';
      circle.style.width = `${size}px`;
      circle.style.height = `${size}px`;
      circle.style.left = `${event.clientX - box.left - el.clientLeft - size / 2}px`;
      circle.style.top = `${event.clientY - box.top - el.clientTop - size / 2}px`;
      frame.appendChild(circle);
      el.appendChild(frame);
      const wave = circle.animate(
        [
          { transform: 'scale(0)', opacity: 0.24 },
          { transform: 'scale(1)', opacity: 0 },
        ],
        { duration: 650, easing: 'cubic-bezier(.22,1,.36,1)' },
      );
      wave.onfinish = () => frame.remove();
      wave.oncancel = () => frame.remove();
    };
    addEventListener('pointerdown', press, { passive: true });
    return () => removeEventListener('pointerdown', press);
  }, []);
  return null;
}
