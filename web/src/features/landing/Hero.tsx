'use client';

import { ArrowDown, ArrowRight } from 'lucide-react';
import { animate, motion, useMotionValue, useScroll, useSpring, useTransform } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import type { PointerEvent } from 'react';
import { useEffect, useRef } from 'react';
import { MaskLines } from '@/components/motion/Reveal';
import { Button } from '@/components/ui/button';
import { DepthPortrait } from '@/components/visual/DepthPortrait';
import { Horizon } from '@/components/visual/Horizon';
import { EASE_OUT, SPRING_POINTER } from '@/lib/motion';
import { AFTER_SIGN_IN_PATH } from '@/lib/navigation';

// Le personnage au casque de réalité virtuelle (image du site Kovity) : la personne enfermée dans
// ce qu'on lui montre. Le relief est donné par une carte de profondeur.
const FIGURE = {
  src: '/landing/casque.webp',
  depth: '/landing/casque-relief.png',
  width: 1380,
  height: 1845,
};

const WORD = 'MINDSTACK';

/**
 * Le haut de l'accueil, en trois plans (direction reprise du site Kovity) : le mot « MINDSTACK »
 * en très grand au fond, la personne au casque au premier plan, puis le titre et les actions en
 * bas. Les plans ne bougent pas à la même vitesse (souris et défilement) : c'est ce qui donne la
 * profondeur.
 */
export function Hero({ signedIn }: { signedIn: boolean }) {
  const section = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end start'] });

  // Défilement : le mot du fond traîne, le personnage part plus vite et se détourne, le texte file.
  const wordShift = useTransform(scrollYProgress, [0, 1], ['0%', '46%']);
  const wordOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const figureShift = useTransform(scrollYProgress, [0, 1], ['0%', '-12%']);
  const figureOpacity = useTransform(scrollYProgress, [0.3, 0.92], [1, 0]);
  const figureScale = useTransform(scrollYProgress, [0, 1], [1, 0.9]);
  const textShift = useTransform(scrollYProgress, [0, 1], ['0%', '-34%']);
  const textOpacity = useTransform(scrollYProgress, [0, 0.45], [1, 0]);
  const seam = useTransform(scrollYProgress, [0, 0.22], [0, 1]);

  // Souris : de -1 (bord gauche ou haut) à 1 (bord droit ou bas).
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const followX = useSpring(pointerX, SPRING_POINTER);
  const followY = useSpring(pointerY, SPRING_POINTER);

  // Le relief : la souris l'incline, le défilement le fait tourner.
  const tiltX = useTransform(
    [followX, scrollYProgress],
    ([x, scroll]: number[]) => x * 0.95 - scroll * 1.9,
  );
  const tiltY = useTransform(
    [followY, scrollYProgress],
    ([y, scroll]: number[]) => y * 0.8 + scroll * 0.4,
  );
  const rotateY = useTransform(
    [followX, scrollYProgress],
    ([x, scroll]: number[]) => x * 7 - scroll * 26,
  );
  const rotateX = useTransform(followY, (y) => y * -5);
  const lightX = useTransform(followX, (x) => 0.5 + x * 0.6);
  const lightY = useTransform(followY, (y) => 0.22 + y * 0.36);
  // Les plans glissent en sens inverse l'un de l'autre.
  const wordDrift = useTransform(followX, (x) => x * -16);
  const figureDrift = useTransform(followX, (x) => x * 12);

  function onMove(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== 'mouse' || !section.current) return;
    const rect = section.current.getBoundingClientRect();
    pointerX.set(((event.clientX - rect.left) / rect.width - 0.5) * 2);
    pointerY.set(((event.clientY - rect.top) / rect.height - 0.5) * 2);
  }

  function onLeave() {
    pointerX.set(0);
    pointerY.set(0);
  }

  // Sans souris (téléphone, tablette), le personnage tourne lentement la tête tout seul.
  useEffect(() => {
    if (!window.matchMedia('(hover: none)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const swayX = animate(pointerX, [-0.55, 0.55, -0.55], {
      duration: 10,
      repeat: Number.POSITIVE_INFINITY,
      ease: 'easeInOut',
    });
    const swayY = animate(pointerY, [-0.2, 0.3, -0.2], {
      duration: 13,
      repeat: Number.POSITIVE_INFINITY,
      ease: 'easeInOut',
    });
    return () => {
      swayX.stop();
      swayY.stop();
    };
  }, [pointerX, pointerY]);

  return (
    <section
      ref={section}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="relative isolate h-[100svh] min-h-[40rem] overflow-clip"
    >
      <div className="absolute inset-0 -z-10" aria-hidden>
        {/* Dégradé fixe : visible le temps que la lumière animée se charge. */}
        <div className="absolute inset-0 bg-[radial-gradient(78%_52%_at_50%_112%,oklch(0.78_0.12_20/0.45)_0%,oklch(0.6_0.22_24/0.42)_22%,oklch(0.3_0.1_24/0.3)_50%,transparent_80%)]" />
        <Horizon progress={scrollYProgress} className="absolute inset-0" />
      </div>

      {/* Plan du fond : la devise, puis « MINDSTACK » en très grand. */}
      <motion.p
        aria-hidden
        className="absolute inset-x-0 top-[12svh] text-center font-medium text-[0.62rem] text-[oklch(0.82_0.08_20/0.75)] uppercase tracking-[0.34em] sm:text-[0.7rem]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.45 }}
        style={{ y: wordShift }}
      >
        Vérifier avant de croire
      </motion.p>
      <motion.div
        aria-hidden
        className="absolute inset-x-0 top-[17svh] flex justify-center px-[3vw] lg:top-[15svh]"
        style={{ y: wordShift, opacity: wordOpacity }}
      >
        <motion.p
          className="display flex w-full max-w-[110rem] justify-between font-semibold text-[clamp(3.4rem,15.2vw,17rem)] leading-[0.85] tracking-[-0.06em]"
          style={{ x: wordDrift }}
        >
          {[...WORD].map((letter, index) => (
            <motion.span
              // biome-ignore lint/suspicious/noArrayIndexKey: les lettres du mot se répètent (K, S…), leur rang est leur identité.
              key={index}
              className="bg-[linear-gradient(180deg,oklch(0.9_0.06_20/0.5)_0%,oklch(0.62_0.22_24/0.3)_55%,oklch(0.55_0.22_24/0.05)_100%)] bg-clip-text text-transparent"
              initial={{ opacity: 0, transform: 'translateY(26px)' }}
              animate={{ opacity: 1, transform: 'translateY(0px)' }}
              transition={{ duration: 1.1, ease: EASE_OUT, delay: 0.05 + index * 0.06 }}
            >
              {letter}
            </motion.span>
          ))}
        </motion.p>
      </motion.div>

      {/* Premier plan : la personne au casque. Elle monte depuis le bas, puis suit la souris. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-[15rem] flex justify-center sm:bottom-[13rem] lg:bottom-0"
      >
        <motion.div
          className="w-[min(92vw,calc((84svh_-_15rem)*0.748))] max-w-none shrink-0 sm:w-[min(74vw,calc((86svh_-_13rem)*0.748))] lg:w-[min(56vw,64svh)]"
          style={{ y: figureShift, x: figureDrift, opacity: figureOpacity, scale: figureScale }}
        >
          <motion.div
            className="relative"
            initial={{ opacity: 0, transform: 'translateY(58%)' }}
            animate={{ opacity: 1, transform: 'translateY(0%)' }}
            transition={{ duration: 1.35, ease: EASE_OUT, delay: 0.1 }}
          >
            {/* Derrière elle, une grande lueur rouge : elle détache la silhouette du fond. */}
            <div className="hero-glow absolute top-[30%] left-1/2 aspect-square w-[150%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,oklch(0.62_0.23_24/0.6),oklch(0.5_0.2_24/0.28)_46%,oklch(0.3_0.12_24/0.1)_72%,transparent)]" />
            <Image
              src="/landing/casque-aura.png"
              alt=""
              width={360}
              height={481}
              sizes="100vw"
              className="hero-halo absolute inset-0 h-full w-full scale-[1.12] opacity-60 [filter:hue-rotate(100deg)_saturate(1.2)]"
            />
            <motion.div
              className="hero-figure will-change-transform"
              style={{ rotateX, rotateY, transformPerspective: 1300 }}
            >
              <DepthPortrait
                src={FIGURE.src}
                depthSrc={FIGURE.depth}
                width={FIGURE.width}
                height={FIGURE.height}
                tiltX={tiltX}
                tiltY={tiltY}
                lightX={lightX}
                lightY={lightY}
                sizes="(min-width: 1024px) 64svh, 92vw"
              />
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* Sous le texte, un voile sombre : il reste lisible sur les épaules du personnage. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-t from-background via-background/75 to-transparent lg:h-[36%] lg:from-background/95 lg:via-background/50"
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent to-background"
        style={{ opacity: seam }}
      />

      {/* Le titre à gauche, les actions dessous, un lien discret à droite. */}
      <motion.div
        className="absolute inset-x-0 bottom-0 z-10 mx-auto flex w-full max-w-[84rem] flex-col gap-6 px-5 pb-8 lg:flex-row lg:items-end lg:justify-between lg:gap-10 lg:px-10 lg:pb-12"
        style={{ y: textShift, opacity: textOpacity }}
      >
        <div className="grid max-w-[38rem] gap-5">
          <h1 className="display text-[clamp(2rem,7.6vw,2.6rem)] lg:text-[clamp(2.4rem,3.4vw,3.5rem)]">
            <MaskLines lines={['Une info douteuse ?', 'Faites-la juger.']} immediate delay={0.4} />
          </h1>
          <motion.p
            className="max-w-[32rem] text-[0.98rem] text-foreground/75 leading-relaxed"
            initial={{ opacity: 0, transform: 'translateY(14px)' }}
            animate={{ opacity: 1, transform: 'translateY(0px)' }}
            transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.7 }}
          >
            Voyez d’où elle vient, écoutez les deux camps, puis concluez seulement quand les preuves
            le permettent.
          </motion.p>
          <motion.div
            className="flex flex-wrap items-center gap-x-6 gap-y-3"
            initial={{ opacity: 0, transform: 'translateY(14px)' }}
            animate={{ opacity: 1, transform: 'translateY(0px)' }}
            transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.82 }}
          >
            <Button asChild variant="solid" size="lg" className="group/btn pr-1.5">
              <Link href={signedIn ? AFTER_SIGN_IN_PATH : '/signup'}>
                {signedIn ? 'Ouvrir MindStack' : 'Créer un compte'}
                <span className="btn-swap size-8 rounded-full bg-background text-foreground">
                  <ArrowRight aria-hidden className="size-4" />
                  <ArrowRight aria-hidden className="size-4" />
                </span>
              </Link>
            </Button>
            {!signedIn && (
              <Link href="/login#demo" className="link-arrow text-[0.95rem] text-foreground/85">
                Voir la démo
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            )}
          </motion.div>
        </div>
        <motion.a
          href="#parcours"
          data-way="down"
          className="link-arrow hidden shrink-0 self-end text-[0.95rem] text-foreground/80 lg:inline-flex"
          initial={{ opacity: 0, transform: 'translateY(14px)' }}
          animate={{ opacity: 1, transform: 'translateY(0px)' }}
          transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.95 }}
        >
          Le parcours d’une information
          <ArrowDown aria-hidden className="scroll-nudge size-4" />
        </motion.a>
      </motion.div>
    </section>
  );
}
