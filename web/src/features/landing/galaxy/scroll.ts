import Lenis from 'lenis';
import { gsap, ScrollTrigger } from './motion';

let lenis: Lenis | null = null;
const raf = (time: number) => lenis?.raf(time * 1000);

/** Défilement fluide : Lenis, branché sur le ticker de gsap pour que ScrollTrigger reste juste. */
export function initScroll() {
  if (lenis) return lenis;
  lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - 2 ** (-10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.6,
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

export function destroyScroll() {
  gsap.ticker.remove(raf);
  gsap.ticker.lagSmoothing(500, 33);
  lenis?.destroy();
  lenis = null;
}
