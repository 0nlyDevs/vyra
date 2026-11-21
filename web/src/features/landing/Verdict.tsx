'use client';

import { Check, Minus, Scale, Search, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { CERTAINTY_CRITERIA } from '@/lib/domain';
import { gsap, useGSAP, useReducedMotion } from './galaxy/motion';

// Les cinq conclusions possibles du juge, une par écran :
// le fond change de teinte, le mot monte, la règle qui y mène apparaît. « Informations
// insuffisantes » est une conclusion comme les autres.

const VERDICTS = [
  {
    key: 'established',
    word: 'Établi',
    tone: '#3ddc84',
    wash: '#0f2219',
    Icon: Check,
    rule: CERTAINTY_CRITERIA.established,
  },
  {
    key: 'probable',
    word: 'Probable',
    tone: '#3b8cff',
    wash: '#0f1a2e',
    Icon: Search,
    rule: CERTAINTY_CRITERIA.probable,
  },
  {
    key: 'uncertain',
    word: 'Incertain',
    tone: '#ffb224',
    wash: '#2a2010',
    Icon: Scale,
    rule: CERTAINTY_CRITERIA.uncertain,
  },
  {
    key: 'contradicted',
    word: 'Contredit',
    tone: '#ff4a3d',
    wash: '#2a1311',
    Icon: X,
    rule: CERTAINTY_CRITERIA.contradicted,
  },
  {
    key: 'insufficient',
    word: 'Insuffisant',
    tone: '#9a9aa2',
    wash: '#18181b',
    Icon: Minus,
    rule: CERTAINTY_CRITERIA.insufficient,
  },
] as const;

const LINES = [
  'Plusieurs pièces indépendantes, aucune contre.',
  'Une pièce solide, et rien contre elle.',
  'De bonnes pièces, mais elles se contredisent.',
  'Au moins une pièce solide dément l’information.',
  'Pas assez de pièces : le juge le dit, sans deviner.',
];

export function Verdict() {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();

  useGSAP(
    () => {
      const el = root.current;
      if (reduce || !el) return;
      const items = gsap.utils.toArray<HTMLElement>('.verdict-item');
      const wash = el.querySelector<HTMLElement>('.verdict-wash');
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.5,
          onUpdate: (st) =>
            setActive(Math.min(VERDICTS.length - 1, Math.floor(st.progress * VERDICTS.length))),
        },
      });
      items.forEach((item, i) => {
        const word = item.querySelector('.verdict-word span');
        const icon = item.querySelector('.verdict-icon');
        const copy = item.querySelectorAll('.verdict-line, .verdict-rule');
        const last = i === items.length - 1;
        if (wash)
          tl.to(wash, { backgroundColor: VERDICTS[i].wash, duration: 0.45, ease: 'none' }, i);
        tl.fromTo(
          icon,
          { scale: 0, rotate: -40 },
          { scale: 1, rotate: 0, duration: 0.3, ease: 'back.out(1.8)' },
          i + 0.04,
        );
        tl.fromTo(
          word,
          { yPercent: 112 },
          { yPercent: 0, duration: 0.34, ease: 'power3.out' },
          i + 0.06,
        );
        tl.fromTo(
          copy,
          { opacity: 0, y: 22 },
          { opacity: 1, y: 0, duration: 0.3, stagger: 0.06, ease: 'power2.out' },
          i + 0.2,
        );
        if (!last) {
          tl.to(word, { yPercent: -112, duration: 0.26, ease: 'power3.in' }, i + 0.78);
          tl.to(icon, { scale: 0, duration: 0.22, ease: 'power2.in' }, i + 0.8);
          tl.to(copy, { opacity: 0, y: -14, duration: 0.2, ease: 'power2.in' }, i + 0.76);
        }
      });
      // La timeline doit durer exactement « une unité par conclusion » : sinon le défilement l'étale
      // sur plus que ça et les dernières conclusions arrivent en retard, texte encore caché.
      const pad = items.length - tl.duration();
      if (pad > 0) tl.to({}, { duration: pad }, tl.duration());
    },
    { scope: root, dependencies: [reduce] },
  );

  const jump = (i: number) => () => {
    const el = root.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const span = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + (span * (i + 0.45)) / VERDICTS.length, behavior: 'smooth' });
  };

  return (
    <section
      ref={root}
      id="verdict"
      aria-label="Les cinq conclusions du juge"
      className={`verdict${reduce ? ' is-flat' : ''}`}
    >
      <div className="verdict-pin">
        <div className="verdict-frame">
          <div className="verdict-wash" />
          <div className="verdict-stage">
            {VERDICTS.map((v, i) => (
              <div className="verdict-item" key={v.key}>
                <div>
                  <span className="verdict-icon" style={{ background: v.tone }}>
                    <v.Icon size={34} strokeWidth={3} />
                  </span>
                  <div className="display verdict-word">
                    <span>{v.word}</span>
                  </div>
                  <p className="verdict-line">{LINES[i]}</p>
                  <p className="verdict-rule mono">{v.rule}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="verdict-legend" aria-hidden>
            {VERDICTS.map((v, i) => (
              <button
                key={v.key}
                type="button"
                className={i === active ? 'is-active' : ''}
                onClick={jump(i)}
                tabIndex={-1}
              >
                <i style={{ background: v.tone }} />
                <span>{v.word}</span>
              </button>
            ))}
          </div>
          <div className="verdict-foot mono">
            Cinq conclusions, jamais une sixième. Le niveau vient des pièces.
          </div>
        </div>
      </div>
    </section>
  );
}
