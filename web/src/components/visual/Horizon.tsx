'use client';

import type { MotionValue } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

// La lumière de la marque (reprise du site Kovity, passée au rouge) : une lueur monte du bas de l'écran,
// en dégradé, sans aucun contour. Des voiles et des rayons en montent lentement,
// elle se déplace avec la souris et s'éteint doucement au défilement.
// Dessiné par la carte graphique, sans bibliothèque ni image à télécharger.

const VERTEX = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const FRAGMENT = `
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform vec2 uPointer;
uniform float uScroll;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p = p * 2.03 + vec2(17.0, 9.0);
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  float aspect = uResolution.x / uResolution.y;
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y);
  float t = uTime;

  // Les couleurs de la marque, du plus sombre au plus clair.
  vec3 ink = vec3(0.047, 0.018, 0.022);
  vec3 indigo = vec3(0.22, 0.025, 0.04);
  vec3 violet = vec3(0.86, 0.14, 0.17);
  vec3 lilac = vec3(1.0, 0.72, 0.7);

  // La source de lumière est sous le bord bas de l'écran, attirée par la souris.
  // Aucune ligne : seulement une lueur qui monte en dégradé.
  vec2 source = vec2(uPointer.x * 0.5 * aspect * 0.62, -0.14);
  vec2 q = p - source;
  q.x *= 0.5 + 0.1 / max(aspect, 0.6);
  float above = max(p.y, 0.0);

  // Deux voiles lents déforment la distance : la lueur respire au lieu de dessiner un cercle.
  float veil = fbm(vec2(p.x * 1.25 + t * 0.025, p.y * 1.8 - t * 0.05));
  float wisp = fbm(vec2(p.x * 2.7 - t * 0.018, p.y * 3.4 - t * 0.08) + veil * 1.4);
  float r = max(length(q) * (0.82 + 0.4 * veil) - 0.05 * wisp, 0.0);

  // Des rayons fins qui montent de la lueur.
  float streak = fbm(vec2(p.x * 6.5 + veil * 2.0, p.y * 0.85 - t * 0.07));
  float rays = smoothstep(0.42, 0.94, streak) * exp(-r * 4.4);

  // Au défilement, la lumière s'éteint doucement.
  float fade = 1.0 - smoothstep(0.0, 0.75, uScroll);

  vec3 light = indigo * exp(-r * 3.0) * 1.5;
  light += violet * exp(-r * 5.6) * (0.9 + 0.5 * wisp);
  light += violet * rays * 0.34;
  light += lilac * exp(-r * 11.5) * 0.85;
  vec3 color = ink + light * fade;

  // Quelques étoiles rondes, loin de la lumière, qui scintillent doucement.
  vec2 grid = gl_FragCoord.xy / 5.0;
  vec2 cell = floor(grid);
  float seed = hash(cell);
  float dotShape = smoothstep(0.34, 0.0, length(fract(grid) - 0.5));
  float star = step(0.991, seed) * dotShape * (0.4 + 0.6 * sin(t * 1.3 + seed * 90.0));
  color += vec3(1.0, 0.84, 0.84) * star * smoothstep(0.12, 0.55, above) * 0.45;

  // Vignette légère, et un grain fin contre les bandes de couleur.
  color *= 1.0 - 0.28 * pow(length(uv - vec2(0.5, 0.42)), 2.0);
  color += (hash(gl_FragCoord.xy + fract(t)) - 0.5) * 0.016;

  gl_FragColor = vec4(color, 1.0);
}`;

type Props = {
  /** Avancement du défilement dans la section, de 0 à 1 : il éteint doucement la lumière. */
  progress?: MotionValue<number>;
  /** Où se pose la lumière la plus vive avant que la souris ne bouge : de -1 (gauche) à 1 (droite). */
  restX?: number;
  className?: string;
};

export function Horizon({ progress, restX = 0, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', {
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });
    // Pas de 3D sur cet appareil : le dégradé fixe placé derrière reste visible.
    if (!gl) return;
    // Alias non nuls : les fonctions internes ci-dessous les utilisent.
    const surface = canvas;
    const context = gl;

    function compile(type: number, source: string) {
      if (!gl) return null;
      const shader = context.createShader(type);
      if (!shader) return null;
      context.shaderSource(shader, source);
      context.compileShader(shader);
      return shader;
    }

    const program = context.createProgram();
    const vertex = compile(context.VERTEX_SHADER, VERTEX);
    const fragment = compile(context.FRAGMENT_SHADER, FRAGMENT);
    if (!program || !vertex || !fragment) return;
    context.attachShader(program, vertex);
    context.attachShader(program, fragment);
    context.linkProgram(program);
    if (!context.getProgramParameter(program, context.LINK_STATUS)) return;
    // biome-ignore lint/correctness/useHookAtTopLevel: méthode WebGL, pas un hook React.
    context.useProgram(program);

    // Un seul triangle qui couvre tout l'écran.
    const buffer = context.createBuffer();
    context.bindBuffer(context.ARRAY_BUFFER, buffer);
    context.bufferData(
      context.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      context.STATIC_DRAW,
    );
    const location = context.getAttribLocation(program, 'position');
    context.enableVertexAttribArray(location);
    context.vertexAttribPointer(location, 2, context.FLOAT, false, 0, 0);

    const uResolution = context.getUniformLocation(program, 'uResolution');
    const uTime = context.getUniformLocation(program, 'uTime');
    const uPointer = context.getUniformLocation(program, 'uPointer');
    const uScroll = context.getUniformLocation(program, 'uScroll');

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pointer = { x: restX, y: 0, targetX: restX, targetY: 0 };
    const started = performance.now();
    let frame = 0;
    let visible = true;
    let first = true;

    function resize() {
      // La lumière est douce : on la calcule en résolution réduite, c'est invisible et bien plus léger.
      const scale = Math.min(window.devicePixelRatio || 1, 2) * 0.62;
      const width = Math.max(2, Math.round(surface.clientWidth * scale));
      const height = Math.max(2, Math.round(surface.clientHeight * scale));
      if (surface.width !== width || surface.height !== height) {
        surface.width = width;
        surface.height = height;
        context.viewport(0, 0, width, height);
      }
    }

    function draw(now: number) {
      pointer.x += (pointer.targetX - pointer.x) * 0.04;
      pointer.y += (pointer.targetY - pointer.y) * 0.04;
      context.uniform2f(uResolution, surface.width, surface.height);
      context.uniform1f(uTime, reduce ? 12 : (now - started) / 1000);
      context.uniform2f(uPointer, pointer.x, pointer.y);
      context.uniform1f(uScroll, progress ? progress.get() : 0);
      context.drawArrays(context.TRIANGLES, 0, 3);
      if (first) {
        first = false;
        setReady(true);
      }
    }

    function loop(now: number) {
      draw(now);
      frame = visible && !reduce ? requestAnimationFrame(loop) : 0;
    }

    function start() {
      if (frame === 0) frame = requestAnimationFrame(loop);
    }

    function onPointer(event: PointerEvent) {
      if (event.pointerType !== 'mouse') return;
      pointer.targetX = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.targetY = (event.clientY / window.innerHeight) * 2 - 1;
    }

    function onResize() {
      resize();
      if (reduce) draw(performance.now());
    }

    // On ne dessine que lorsque la section est à l'écran et l'onglet visible.
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && !document.hidden;
      if (visible) start();
    });
    function onVisibility() {
      visible = !document.hidden;
      if (visible) start();
    }

    resize();
    observer.observe(surface);
    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    start();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVisibility);
      // On garde le contexte graphique : React peut remonter ce composant, et un contexte
      // abandonné ne redessinerait plus rien.
      context.deleteProgram(program);
      context.deleteBuffer(buffer);
    };
  }, [progress, restX]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn(
        'h-full w-full transition-opacity duration-[1400ms] ease-out-strong',
        ready ? 'opacity-100' : 'opacity-0',
        className,
      )}
    />
  );
}
