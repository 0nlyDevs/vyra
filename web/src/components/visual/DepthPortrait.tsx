'use client';

import type { MotionValue } from 'motion/react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

// Un portrait en relief (repris du site Kovity). La photo est plate, mais une carte de
// profondeur (clair = proche) dit à la carte graphique ce qui est devant : quand l'inclinaison
// change, le casque bouge plus que les épaules. La photo d'origine est violette : le rendu la
// repeint aux couleurs de MindStack (nuit, rouge, reflets rosés). Sans carte graphique
// utilisable, la photo reste à plat, teintée par un filtre CSS.

type Props = {
  src: string;
  depthSrc: string;
  width: number;
  height: number;
  /** Inclinaison, de -1 à 1 sur chaque axe. x positif : la tête se tourne vers la droite. */
  tiltX: MotionValue<number>;
  tiltY: MotionValue<number>;
  /** Position de la lumière dans le cadre, de 0 à 1 (0,0 = en haut à gauche). */
  lightX: MotionValue<number>;
  lightY: MotionValue<number>;
  sizes: string;
  className?: string;
};

const VERTEX = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = vec2(position.x * 0.5 + 0.5, 0.5 - position.y * 0.5);
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const FRAGMENT = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uColor;
uniform sampler2D uDepth;
uniform vec2 uTilt;
uniform vec2 uLight;
uniform float uAspect;
uniform vec2 uTexel;

void main() {
  // Parallaxe : ce qui est proche se décale plus que ce qui est loin.
  vec2 shift = uTilt * vec2(0.05, 0.034);
  float d = texture2D(uDepth, vUv).r;
  for (int i = 0; i < 3; i++) {
    d = texture2D(uDepth, vUv - shift * (d - 0.45)).r;
  }
  vec2 p = vUv - shift * (d - 0.45);
  vec4 color = texture2D(uColor, p);

  // Repeint : la valeur (clarté) de chaque point garde le dessin, la teinte devient rouge.
  float hi = max(max(color.r, color.g), color.b);
  float lo = min(min(color.r, color.g), color.b);
  float sat = hi > 0.0 ? (hi - lo) / hi : 0.0;
  vec3 deep = vec3(0.09, 0.012, 0.018);
  vec3 red = vec3(0.93, 0.15, 0.17);
  vec3 hot = vec3(1.0, 0.84, 0.82);
  vec3 tinted = mix(deep, red, smoothstep(0.03, 0.72, hi));
  tinted = mix(tinted, hot, smoothstep(0.62, 1.0, hi) * (1.0 - sat * 0.55));

  // Le relief donne l'orientation de chaque point, donc la façon dont il prend la lumière.
  vec2 e = uTexel * 3.5;
  float dx = texture2D(uDepth, p + vec2(e.x, 0.0)).r - texture2D(uDepth, p - vec2(e.x, 0.0)).r;
  float dy = texture2D(uDepth, p + vec2(0.0, e.y)).r - texture2D(uDepth, p - vec2(0.0, e.y)).r;
  vec3 normal = normalize(vec3(-dx * uAspect, -dy, 0.11));
  vec2 toLight = (uLight - p) * vec2(uAspect, 1.0);
  vec3 light = normalize(vec3(toLight, 0.4));
  float diffuse = clamp(dot(normal, light), 0.0, 1.0);
  float shine = pow(clamp(dot(normal, normalize(light + vec3(0.0, 0.0, 1.0))), 0.0, 1.0), 22.0);

  // Le contour lumineux : le bord de la silhouette, du côté d'où vient la lumière.
  vec2 outward = normalize(toLight + vec2(0.0001)) / vec2(uAspect, 1.0);
  float beyond = texture2D(uColor, p + outward * 0.011).a;
  float rim = color.a * (1.0 - beyond);

  vec3 rose = vec3(1.0, 0.8, 0.78);
  vec3 lit = tinted * (0.88 + 0.34 * diffuse) + rose * shine * 0.14 + mix(red, rose, 0.5) * rim * 0.95;
  gl_FragColor = vec4(lit * color.a, color.a);
}`;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function createTexture(gl: WebGLRenderingContext, unit: number, image: HTMLImageElement) {
  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}

export function DepthPortrait({
  src,
  depthSrc,
  width,
  height,
  tiltX,
  tiltY,
  lightX,
  lightY,
  sizes,
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      premultipliedAlpha: true,
    });
    if (!gl) return;

    let disposed = false;
    let frame = 0;
    const cleanups: Array<() => void> = [];

    function compile(type: number, source: string) {
      if (!gl) return null;
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
    }

    Promise.all([loadImage(src), loadImage(depthSrc)])
      .then(([photo, depth]) => {
        if (disposed) return;
        const vertex = compile(gl.VERTEX_SHADER, VERTEX);
        const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT);
        const program = gl.createProgram();
        if (!vertex || !fragment || !program) return;
        gl.attachShader(program, vertex);
        gl.attachShader(program, fragment);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
        // biome-ignore lint/correctness/useHookAtTopLevel: méthode WebGL, pas un hook React.
        gl.useProgram(program);

        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
          gl.STATIC_DRAW,
        );
        const position = gl.getAttribLocation(program, 'position');
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

        createTexture(gl, 0, photo);
        createTexture(gl, 1, depth);
        gl.uniform1i(gl.getUniformLocation(program, 'uColor'), 0);
        gl.uniform1i(gl.getUniformLocation(program, 'uDepth'), 1);
        gl.uniform1f(gl.getUniformLocation(program, 'uAspect'), width / height);
        gl.uniform2f(
          gl.getUniformLocation(program, 'uTexel'),
          1 / depth.naturalWidth,
          1 / depth.naturalHeight,
        );
        const uTilt = gl.getUniformLocation(program, 'uTilt');
        const uLight = gl.getUniformLocation(program, 'uLight');
        gl.clearColor(0, 0, 0, 0);

        function draw() {
          frame = 0;
          if (disposed || !canvas || !gl) return;
          gl.viewport(0, 0, canvas.width, canvas.height);
          gl.clear(gl.COLOR_BUFFER_BIT);
          gl.uniform2f(uTilt, tiltX.get(), tiltY.get());
          gl.uniform2f(uLight, lightX.get(), lightY.get());
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }
        // On ne redessine que si quelque chose a bougé.
        function schedule() {
          if (!frame) frame = requestAnimationFrame(draw);
        }
        function resize() {
          if (!canvas) return;
          const ratio = Math.min(window.devicePixelRatio || 1, 2);
          const nextWidth = Math.max(1, Math.round(canvas.clientWidth * ratio));
          const nextHeight = Math.max(1, Math.round(canvas.clientHeight * ratio));
          if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
            canvas.width = nextWidth;
            canvas.height = nextHeight;
          }
          schedule();
        }

        const observer = new ResizeObserver(resize);
        observer.observe(canvas);
        cleanups.push(() => observer.disconnect());
        for (const value of [tiltX, tiltY, lightX, lightY]) {
          cleanups.push(value.on('change', schedule));
        }
        resize();
        draw();
        setLive(true);
      })
      .catch(() => {
        // Image introuvable : la photo à plat reste affichée.
      });

    return () => {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      for (const cleanup of cleanups) cleanup();
    };
  }, [src, depthSrc, width, height, tiltX, tiltY, lightX, lightY]);

  return (
    <div className={cn('relative', className)} style={{ aspectRatio: `${width} / ${height}` }}>
      <Image
        src={src}
        alt=""
        width={width}
        height={height}
        priority
        sizes={sizes}
        className={cn(
          'h-full w-full [filter:hue-rotate(100deg)_saturate(1.2)]',
          live ? 'opacity-0' : 'opacity-100',
        )}
      />
      <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />
    </div>
  );
}
