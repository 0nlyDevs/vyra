'use client';

import { type MotionValue, motion, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';

// La promesse, en une phrase qui s'allume mot à mot au défilement.
const TEXT =
  'Un chatbot donne un avis. MindStack montre d’où vient l’information, fait plaider les deux camps, et vous laisse juger sur pièces.';
// Les mots qui portent la promesse restent en rouge une fois allumés.
const STRONG = new Set(['montre', 'plaider', 'juger']);

function Word({
  word,
  index,
  total,
  progress,
}: {
  word: string;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const start = index / total;
  const opacity = useTransform(progress, [start, start + 1 / total], [0.16, 1]);
  const bare = word.replace(/[.,]/g, '');
  return (
    <motion.span style={{ opacity }} className={STRONG.has(bare) ? 'text-primary' : undefined}>
      {word}{' '}
    </motion.span>
  );
}

export function Manifesto() {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 85%', 'end 45%'] });
  const words = TEXT.split(' ');
  return (
    <section
      aria-label="Notre promesse"
      className="mx-auto max-w-[84rem] px-5 py-28 lg:px-10 lg:py-40"
    >
      <p className="eyebrow mb-8">La promesse</p>
      <p ref={ref} className="display max-w-[22ch] text-[clamp(1.9rem,4.6vw,4rem)] leading-[1.08]">
        {words.map((word, index) => (
          <Word
            // biome-ignore lint/suspicious/noArrayIndexKey: un même mot peut revenir dans la phrase, sa place est son identité.
            key={index}
            word={word}
            index={index}
            total={words.length}
            progress={scrollYProgress}
          />
        ))}
      </p>
    </section>
  );
}
