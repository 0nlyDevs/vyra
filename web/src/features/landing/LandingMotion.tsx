'use client';

import { useEffect } from 'react';
import { gsap, ScrollTrigger, useReducedMotion } from './galaxy/motion';
import { destroyScroll, initScroll } from './galaxy/scroll';

// Ces blocs ont leur propre animation (piste horizontale du parcours, hero) : pas de révélation.
const SKIP = '.hero-galaxie, .parcours';

/**
 * Le mouvement de l'accueil : défilement fluide (Lenis) et apparitions au défilement
 * (titres ligne par ligne, blocs qui montent, enfants qui se suivent). Sans mouvement réduit,
 * la page reste lisible telle quelle : la classe `motion` n'est posée qu'une fois tout branché.
 */
export function LandingMotion() {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const root = document.querySelector<HTMLElement>('.landing');
    root?.classList.add('motion');
    initScroll();
    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener('load', onLoad);
    document.fonts?.ready.then(onLoad);
    return () => {
      window.removeEventListener('load', onLoad);
      root?.classList.remove('motion');
      destroyScroll();
    };
  }, [reduce]);

  // Chaque bloc s'affiche dès qu'il entre à l'écran (IntersectionObserver), une seule fois. Pas de
  // position calculée d'avance : une page qui change de hauteur (polices, piste du parcours,
  // fenêtre redimensionnée) ne peut pas laisser un texte caché.
  useEffect(() => {
    if (reduce) return;
    const targets = [
      ...document.querySelectorAll<HTMLElement>('[data-lines], [data-reveal]'),
    ].filter((el) => !el.closest(SKIP));
    const play = (el: HTMLElement) => {
      if (el.hasAttribute('data-lines')) {
        gsap.fromTo(
          el.querySelectorAll('.line > span'),
          // `y: 0` : la règle CSS de départ (translateY(112%)) est lue par gsap comme un décalage en
          // pixels ; sans ce zéro, il resterait en place et le titre finirait caché sous son masque.
          { yPercent: 112, y: 0 },
          { yPercent: 0, y: 0, duration: 1.05, stagger: 0.09, ease: 'power4.out' },
        );
      } else if (el.dataset.reveal === 'stagger') {
        gsap.fromTo(
          el.children,
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: 'power3.out' },
        );
      } else {
        gsap.fromTo(
          el,
          { opacity: 0, y: 28 },
          { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' },
        );
      }
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          io.unobserve(entry.target);
          play(entry.target as HTMLElement);
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    for (const el of targets) io.observe(el);
    return () => {
      io.disconnect();
      // Rend tout visible si on quitte la page en cours de route.
      for (const el of targets) {
        gsap.killTweensOf(el);
        gsap.set(el.querySelectorAll('.line > span'), { clearProps: 'all' });
        gsap.set(el, { clearProps: 'opacity,transform' });
        gsap.set(el.children, { clearProps: 'opacity,transform' });
      }
    };
  }, [reduce]);

  return null;
}
