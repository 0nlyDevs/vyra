'use client';

import { RoundedBox } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { GameAnswer } from '@/lib/domain';
import { gameAudio } from './audio';
import { Chibi, type ChibiMood, villagerLook } from './Chibi';
import { PALETTE, perAnswer, RUMOR_SPOT, STAMPS } from './constants';
import type { World } from './world';

// Le passant de la manche : il arrive du fond de la rue, montre sa publication (un grand écran de
// téléphone qui flotte au-dessus de lui), attend le tampon, puis repart.

export type RumorPost = { sourceName: string; content: string; imagePath: string | null };

const POST_SIZE = { width: 1200, height: 860 };

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  context.beginPath();
  context.roundRect(x, y, w, h, r);
}

// Coupe le texte en lignes qui tiennent dans la largeur, avec « … » si ça dépasse.
function wrapLines(
  context: CanvasRenderingContext2D,
  text: string,
  width: number,
  maxLines: number,
) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > width) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1] ?? '';
  while (last && context.measureText(`${last}…`).width > width) last = last.slice(0, -1);
  kept[maxLines - 1] = `${last.trimEnd()}…`;
  return kept;
}

// La publication dessinée sur une toile, à la taille exacte de l'écran flottant : nette et bien
// cadrée quelle que soit la distance.
function drawPost(canvas: HTMLCanvasElement, post: RumorPost, image: HTMLImageElement | null) {
  const context = canvas.getContext('2d');
  if (!context) return;
  const { width, height } = POST_SIZE;
  const pad = 64;
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#fbf7f2';
  roundedRect(context, 0, 0, width, height, 44);
  context.fill();

  context.fillStyle = PALETTE.red;
  context.beginPath();
  context.arc(pad + 46, pad + 46, 46, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#ffffff';
  context.font = '800 46px system-ui, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const initial = post.sourceName.match(/[\p{L}\p{N}]/u)?.[0]?.toUpperCase() ?? '?';
  context.fillText(initial, pad + 46, pad + 48);

  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  context.fillStyle = '#1b1014';
  context.font = '700 44px system-ui, sans-serif';
  context.fillText(post.sourceName, pad + 118, pad + 38, width - pad * 2 - 118);
  context.fillStyle = '#7a6a66';
  context.font = '400 32px system-ui, sans-serif';
  context.fillText('Publication partagée', pad + 118, pad + 84);

  context.fillStyle = '#1b1014';
  context.font = '500 46px system-ui, sans-serif';
  const top = pad + 180;
  const lineHeight = 62;
  const lines = wrapLines(context, post.content, width - pad * 2, image ? 4 : 8);
  lines.forEach((line, index) => {
    context.fillText(line, pad, top + index * lineHeight);
  });

  if (image) {
    const y = top + lines.length * lineHeight - 20;
    const h = height - pad - y;
    const w = width - pad * 2;
    if (h > 60) {
      // Recadrage « cover » : l'image remplit le cadre sans être déformée.
      const ratio = Math.max(w / image.width, h / image.height);
      const sw = w / ratio;
      const sh = h / ratio;
      context.save();
      roundedRect(context, pad, y, w, h, 26);
      context.clip();
      context.drawImage(
        image,
        (image.width - sw) / 2,
        (image.height - sh) / 2,
        sw,
        sh,
        pad,
        y,
        w,
        h,
      );
      context.restore();
    }
  }
}

function usePostTexture(post: RumorPost) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = POST_SIZE.width;
    canvas.height = POST_SIZE.height;
    drawPost(canvas, post, null);
    const result = new THREE.CanvasTexture(canvas);
    result.colorSpace = THREE.SRGBColorSpace;
    result.anisotropy = 8;
    return result;
  }, [post]);
  useEffect(() => {
    if (!post.imagePath) return;
    const image = new Image();
    image.onload = () => {
      drawPost(texture.image as HTMLCanvasElement, post, image);
      texture.needsUpdate = true;
    };
    image.src = post.imagePath;
    return () => {
      image.onload = null;
    };
  }, [post, texture]);
  return texture;
}

// La marque du tampon (VRAI, FAKE, ?) encadrée et penchée, comme un vrai coup de tampon.
function stampMarkTexture(answer: GameAnswer) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (context) {
    const { ink, mark } = STAMPS[answer];
    context.translate(512, 256);
    context.rotate(-0.24);
    context.strokeStyle = ink;
    context.fillStyle = ink;
    context.lineWidth = 26;
    roundedRect(context, -400, -150, 800, 300, 40);
    context.stroke();
    context.font = `900 ${mark.length > 2 ? 210 : 240}px system-ui, sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(mark, 0, 12);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const START = new THREE.Vector3(2.5, 0, -40);
const SPOT = new THREE.Vector3(...RUMOR_SPOT);
const EXIT = new THREE.Vector3(-14, 0, -12);
const WALK_SPEED = 3.4;

export function Rumor({
  world,
  round,
  post,
  answer,
  correct,
  leaving,
  onArrived,
}: {
  world: World;
  round: number;
  post: RumorPost;
  answer: GameAnswer | null;
  correct: boolean | null;
  leaving: boolean;
  onArrived: () => void;
}) {
  const camera = useThree((state) => state.camera);
  const npc = useRef<THREE.Group>(null);
  const board = useRef<THREE.Group>(null);
  const hit = useRef<THREE.Mesh>(null);
  const mood = useRef<ChibiMood>('walk');
  const arrived = useRef(false);
  const arrivedCallback = useRef(onArrived);
  arrivedCallback.current = onArrived;
  const look = useMemo(() => villagerLook(round * 7 + 3), [round]);

  // Nouvelle manche : le passant repart du fond de la rue.
  // biome-ignore lint/correctness/useExhaustiveDependencies: on relance à chaque nouvelle manche.
  useLayoutEffect(() => {
    npc.current?.position.copy(START);
    if (board.current) board.current.scale.setScalar(0.001);
    arrived.current = false;
    mood.current = 'walk';
  }, [round]);

  useEffect(() => {
    if (answer === null) return;
    mood.current = correct ? 'happy' : 'talk';
  }, [answer, correct]);

  // La publication se vise : elle est enregistrée comme cible.
  useEffect(() => {
    const mesh = hit.current;
    if (!mesh) return;
    world.targets.set(mesh, { kind: 'board' });
    return () => {
      world.targets.delete(mesh);
    };
  }, [world]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const body = npc.current;
    if (!body) return;
    const goal = leaving ? EXIT : SPOT;
    const toGoal = goal.clone().sub(body.position);
    toGoal.y = 0;
    const distance = toGoal.length();

    if (distance > 0.05) {
      if (!leaving || arrived.current) mood.current = 'walk';
      const step = Math.min(distance, WALK_SPEED * delta);
      body.position.addScaledVector(toGoal.normalize(), step);
      const heading = Math.atan2(toGoal.x, toGoal.z);
      body.rotation.y = THREE.MathUtils.damp(body.rotation.y, heading, 10, delta);
    } else if (!leaving) {
      if (!arrived.current) {
        arrived.current = true;
        mood.current = 'talk';
        gameAudio.arrive();
        arrivedCallback.current();
      }
      // Arrivé : il se tourne vers le joueur.
      const face = Math.atan2(
        camera.position.x - body.position.x,
        camera.position.z - body.position.z,
      );
      body.rotation.y = THREE.MathUtils.damp(body.rotation.y, face, 5, delta);
    }

    // La publication apparaît en ressort, et suit le joueur du regard (sur l'axe vertical).
    if (board.current) {
      const shown = arrived.current && !leaving;
      const target = shown ? 1.4 : 0.001;
      const current = board.current.scale.x;
      board.current.scale.setScalar(THREE.MathUtils.damp(current, target, shown ? 7 : 12, delta));
      board.current.position.set(
        body.position.x,
        3.35 + Math.sin(performance.now() / 700) * 0.06,
        body.position.z + 0.4,
      );
      const yaw = Math.atan2(
        camera.position.x - board.current.position.x,
        camera.position.z - board.current.position.z,
      );
      board.current.rotation.y = THREE.MathUtils.damp(board.current.rotation.y, yaw, 6, delta);
    }
  });

  const postTexture = usePostTexture(post);
  const postMaterial = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  postMaterial.map = postTexture;
  postMaterial.needsUpdate = true;
  const stampTextures = useMemo(() => perAnswer(stampMarkTexture), []);
  const stampMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, depthWrite: false }),
    [],
  );
  const stampMesh = useRef<THREE.Mesh>(null);
  const stampedAt = useRef(0);
  useEffect(() => {
    if (!answer) return;
    stampMaterial.map = stampTextures[answer];
    stampMaterial.needsUpdate = true;
    stampedAt.current = performance.now() / 1000;
  }, [answer, stampMaterial, stampTextures]);
  useFrame(() => {
    const mesh = stampMesh.current;
    if (!mesh) return;
    mesh.visible = answer !== null;
    if (!answer) return;
    // Le tampon s'écrase sur l'écran : grand et transparent, puis net à sa taille.
    const progress = Math.min(1, (performance.now() / 1000 - stampedAt.current) / 0.28);
    const eased = 1 - (1 - progress) ** 3;
    mesh.scale.setScalar(2.2 - eased * 1.2);
    stampMaterial.opacity = eased * 0.94;
  });

  return (
    <group>
      <group ref={npc}>
        <Chibi look={look} moodRef={mood} phone seed={round} scale={1.15} />
      </group>
      <group ref={board}>
        {/* Halo rouge derrière l'écran : il brille grâce à l'effet de halo. */}
        <RoundedBox args={[3.1, 2.25, 0.04]} radius={0.12} position={[0, 0, -0.06]}>
          <meshBasicMaterial color={[2.2, 0.35, 0.35]} toneMapped={false} />
        </RoundedBox>
        <RoundedBox args={[3, 2.15, 0.1]} radius={0.12}>
          <meshToonMaterial color="#1a1216" />
        </RoundedBox>
        <mesh ref={hit} position={[0, 0, 0.06]} visible={false}>
          <planeGeometry args={[3, 2.15]} />
          <meshBasicMaterial />
        </mesh>
        <mesh material={postMaterial} position={[0, 0, 0.056]}>
          <planeGeometry args={[2.86, 2.05]} />
        </mesh>
        <mesh ref={stampMesh} material={stampMaterial} position={[0, -0.05, 0.075]} visible={false}>
          <planeGeometry args={[2.3, 1.15]} />
        </mesh>
      </group>
    </group>
  );
}

// Confettis à la bonne réponse : des petits carrés qui retombent en tournoyant.
export function Confetti({
  trigger,
  origin,
}: {
  trigger: number;
  origin: [number, number, number];
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const count = 180;
  const particles = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        p: new THREE.Vector3(),
        v: new THREE.Vector3(),
        r: new THREE.Euler(),
        s: 0,
      })),
    [],
  );
  const born = useRef(-10);

  useLayoutEffect(() => {
    if (!mesh.current) return;
    const colors = [PALETTE.red, '#f0a63c', '#3fb37f', '#5b7fd1', '#f2ebe3', '#e6d36a'];
    particles.forEach((_, index) => {
      mesh.current?.setColorAt(index, new THREE.Color(colors[index % colors.length]));
    });
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  }, [particles]);

  useEffect(() => {
    if (trigger === 0) return;
    born.current = performance.now() / 1000;
    for (const particle of particles) {
      particle.p.set(origin[0], origin[1], origin[2]);
      const angle = Math.random() * Math.PI * 2;
      const power = 2 + Math.random() * 5;
      particle.v.set(
        Math.cos(angle) * power,
        3 + Math.random() * 6,
        Math.sin(angle) * power * 0.6 + 2,
      );
      particle.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      particle.s = 0.08 + Math.random() * 0.1;
    }
  }, [trigger, origin, particles]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const age = performance.now() / 1000 - born.current;
    if (!mesh.current) return;
    mesh.current.visible = age < 3.2;
    if (!mesh.current.visible) return;
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    particles.forEach((particle, index) => {
      particle.v.y -= 9 * delta;
      particle.v.multiplyScalar(1 - delta * 0.9);
      particle.p.addScaledVector(particle.v, delta);
      particle.r.x += delta * 6;
      particle.r.y += delta * 4;
      const fade = Math.max(0, 1 - Math.max(0, age - 2.2));
      quaternion.setFromEuler(particle.r);
      matrix.compose(
        particle.p,
        quaternion,
        new THREE.Vector3(particle.s, particle.s * 0.6, particle.s).multiplyScalar(fade),
      );
      mesh.current?.setMatrixAt(index, matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, count]}
      visible={false}
      frustumCulled={false}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial side={THREE.DoubleSide} toneMapped={false} />
    </instancedMesh>
  );
}

// L'onde rouge de la rumeur qui se propage, au sol, du passant vers toute la rue.
export function SpreadWave({
  trigger,
  origin,
}: {
  trigger: number;
  origin: [number, number, number];
}) {
  const rings = useRef<THREE.Group>(null);
  const born = useRef(-10);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(2.4, 0.3, 0.3),
        transparent: true,
        toneMapped: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  );
  useEffect(() => {
    if (trigger === 0) return;
    born.current = performance.now() / 1000;
    gameAudio.spread();
  }, [trigger]);
  useFrame(() => {
    const age = performance.now() / 1000 - born.current;
    if (!rings.current) return;
    rings.current.visible = age < 2.4;
    rings.current.children.forEach((child, index) => {
      const local = Math.max(0, age - index * 0.35);
      child.scale.setScalar(0.1 + local * 14);
    });
    material.opacity = Math.max(0, 0.85 - age / 2.4);
  });
  return (
    <group
      ref={rings}
      position={[origin[0], 0.06, origin[2]]}
      rotation={[-Math.PI / 2, 0, 0]}
      visible={false}
    >
      {[0, 1, 2].map((index) => (
        <mesh key={index} material={material}>
          <ringGeometry args={[0.92, 1, 64]} />
        </mesh>
      ))}
    </group>
  );
}
