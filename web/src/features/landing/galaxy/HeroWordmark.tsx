'use client';

import { useEffect, useRef, useState } from 'react';
import { INTRO, introClock } from './intro';
import { gsap } from './motion';

/** Word font size as a share of the stack width (the reference sets 95.4px in 672px). */
const FONT_RATIO = 0.142;
/** Extra distance the sliding letters start tucked behind the first one, in em. */
const BLADE_TUCK = 0.12;

const clamp01 = (e: number) => Math.max(0, Math.min(1, e));

/**
 * The hero word. On load the first letter fades in at the centre, glides to
 * its slot, and the rest of the word slides out from behind it, clipped at
 * its right edge.
 */
export function HeroWordmark({ word, reduce }: { word: string; reduce: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const letters = useRef<(HTMLSpanElement | null)[]>([]);
  const word_ = useRef<HTMLDivElement>(null);
  const [fontPx, setFontPx] = useState(0);

  // The word spans the full width of the copy column, like the reference.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let dead = false;
    const fit = () => {
      if (dead) return;
      const probe = document.createElement('span');
      probe.style.cssText =
        'position:absolute;left:-9999px;top:0;visibility:hidden;white-space:pre;font-size:100px;line-height:1;';
      probe.className = 'hg-word';
      probe.textContent = word;
      el.appendChild(probe);
      const w100 = probe.getBoundingClientRect().width;
      probe.remove();
      const width = el.clientWidth;
      if (w100 > 0 && width > 0) setFontPx(Math.round((width / (w100 / 100)) * 10) / 10);
      else setFontPx(Math.round(width * FONT_RATIO * 10) / 10);
    };
    const fonts = document.fonts?.ready;
    if (fonts) fonts.then(fit).catch(fit);
    else fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => {
      dead = true;
      ro.disconnect();
    };
  }, [word]);

  useEffect(() => {
    if (!fontPx || reduce) {
      return;
    }
    const els = letters.current.filter((e): e is HTMLSpanElement => !!e);
    if (els.length !== word.length) return;
    let baseX: number[] = [];
    let adv: number[] = [];
    const measure = () => {
      for (const e of els) {
        e.style.transform = '';
        e.style.clipPath = '';
      }
      const rects = els.map((e) => e.getBoundingClientRect());
      baseX = rects.map((r) => r.left + r.width / 2);
      adv = rects.map((r) => r.width / fontPx);
    };

    let done = false;
    const tick = () => {
      const t = introClock.t;
      const n = els.length;
      const d = fontPx;
      const left = baseX[0] - (adv[0] * d) / 2;
      const right = baseX[n - 1] + (adv[n - 1] * d) / 2;
      const o = clamp01((t - INTRO.wordAt) / Math.max(0.1, INTRO.wordDur));
      const p = o < 0.5 ? 4 * o * o * o : 1 - (-2 * o + 2) ** 3 / 2;
      // first letter: from the word's centre to its own slot
      const g = baseX[0] + ((left + right) / 2 - baseX[0]) * (1 - p);
      els[0].style.transform = `translate3d(${(g - baseX[0]).toFixed(1)}px, 0, 0)`;
      els[0].style.opacity = String(clamp01(t / 0.3));
      const blade = g + (adv[0] * d) / 2;
      const tucked = -(right - (baseX[0] + (adv[0] * d) / 2)) - BLADE_TUCK * d;
      const y = tucked * (1 - (1 - (1 - o) ** 3));
      for (let k = 1; k < n; k++) {
        const at = baseX[k] + y;
        els[k].style.transform = `translate3d(${y.toFixed(1)}px, 0, 0)`;
        els[k].style.opacity = '1';
        const hidden = blade - (at - (adv[k] * d) / 2);
        els[k].style.clipPath = hidden > 0.5 ? `inset(-20% 0 -20% ${hidden.toFixed(1)}px)` : '';
      }
      if (p >= 1 && o >= 1 && t > 0.35) {
        for (const e of els) {
          e.style.transform = '';
          e.style.opacity = '1';
          e.style.clipPath = '';
        }
        done = true;
        gsap.ticker.remove(tick);
      }
    };

    measure();
    if (introClock.t > INTRO.wordAt + INTRO.wordDur + 0.5) {
      for (const e of els) e.style.opacity = '1';
      return;
    }
    for (const e of els) e.style.opacity = '0';
    gsap.ticker.add(tick);
    const onResize = () => {
      if (!done) measure();
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      gsap.ticker.remove(tick);
      for (const e of els) {
        e.style.transform = '';
        e.style.opacity = '';
        e.style.clipPath = '';
      }
    };
  }, [fontPx, reduce, word]);

  return (
    <div ref={box} className="hg-word-box">
      <div aria-hidden className="hg-word-blur" />
      <div
        ref={word_}
        role="img"
        aria-label={word}
        className="hg-word"
        style={{ fontSize: fontPx || '14.2cqw' }}
      >
        {word.split('').map((ch, i) => (
          <span
            key={i}
            aria-hidden
            className="hg-letter"
            ref={(e) => {
              letters.current[i] = e;
            }}
          >
            {ch}
          </span>
        ))}
      </div>
    </div>
  );
}
