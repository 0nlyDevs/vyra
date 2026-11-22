'use client';

import { useEffect } from 'react';

/**
 * Dit à la page si elle a défilé (`data-scrolled` sur <html>) : la barre du haut devient alors
 * une vitre floutée, avec un filet, au lieu d'un aplat. Un seul écouteur, passif.
 */
export function ScrollState() {
  useEffect(() => {
    const root = document.documentElement;
    let frame = 0;
    const update = () => {
      frame = 0;
      root.toggleAttribute('data-scrolled', window.scrollY > 8);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    addEventListener('scroll', onScroll, { passive: true });
    return () => {
      removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
