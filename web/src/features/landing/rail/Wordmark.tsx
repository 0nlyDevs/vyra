'use client';

import { useRef } from 'react';
import { gsap, useGSAP, useReducedMotion } from '../galaxy/motion';
import { getLenis } from '../galaxy/scroll';

/** Le mot VYRA, fixe en haut à gauche : il apparaît quand on quitte le hero, et ramène à l'accueil. */
export function Wordmark() {
  const ref = useRef<HTMLAnchorElement>(null);
  const reduce = useReducedMotion();

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      if (reduce) {
        gsap.set(el, { opacity: 1, y: 0 });
        el.classList.add('is-on');
        return;
      }
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '#parcours',
          start: 'top 85%',
          toggleActions: 'play none none reverse',
          onToggle: (state) => el.classList.toggle('is-on', state.isActive),
        },
      });
    },
    { dependencies: [reduce] },
  );

  return (
    <a
      ref={ref}
      href="#accueil"
      className="wordmark"
      onClick={(event) => {
        event.preventDefault();
        const target = document.getElementById('accueil');
        if (!target) return;
        const lenis = getLenis();
        if (lenis)
          lenis.scrollTo(target, { duration: 1.4, easing: (t: number) => 1 - (1 - t) ** 4 });
        else target.scrollIntoView({ behavior: 'smooth' });
      }}
    >
      VYRA
    </a>
  );
}
