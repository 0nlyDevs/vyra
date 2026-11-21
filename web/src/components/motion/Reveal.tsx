'use client';

import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { EASE_OUT } from '@/lib/motion';

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** Distance de départ, en pixels. */
  distance?: number;
};

/** Apparition au défilement : monte légèrement, de flou à net. Une seule fois. */
export function Reveal({ children, className, delay = 0, distance = 26 }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, transform: `translateY(${distance}px)`, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, transform: 'translateY(0px)', filter: 'blur(0px)' }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.8, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

/** Un titre ligne par ligne : chaque ligne sort d'un cache, comme un rideau qui se lève. */
export function MaskLines({
  lines,
  className,
  delay = 0,
  immediate = false,
}: {
  lines: string[];
  className?: string;
  delay?: number;
  /** true : joue dès l'arrivée sur la page (haut de page). false : au défilement. */
  immediate?: boolean;
}) {
  return (
    <span className={className}>
      {lines.map((line, index) => (
        <span key={line} className="block overflow-hidden pb-[0.08em]">
          <motion.span
            className="block"
            initial={{ transform: 'translateY(105%)' }}
            {...(immediate
              ? { animate: { transform: 'translateY(0%)' } }
              : {
                  whileInView: { transform: 'translateY(0%)' },
                  viewport: { once: true, amount: 0.6 },
                })}
            transition={{ duration: 1, ease: EASE_OUT, delay: delay + index * 0.09 }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </span>
  );
}
