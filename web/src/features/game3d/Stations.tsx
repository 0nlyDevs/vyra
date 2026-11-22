'use client';

import { Billboard } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { CLUE_KIND_LABELS, CLUE_RATING_LABELS, type ClueKind, type ClueRating } from '@/lib/domain';
import { Chibi, type ChibiMood, villagerLook } from './Chibi';
import { CLUE_SPOTS } from './constants';
import { textTexture, toon } from './toon';
import type { World } from './world';

// ─── Les stands d'indices ───────────────────────────────────────────────────────────────────

function Sign({
  lines,
  color = '#f2ebe3',
  background = '#2c2f4a',
  size = [0.9, 0.6],
}: {
  lines: string[];
  color?: string;
  background?: string;
  size?: [number, number];
}) {
  const texture = useMemo(
    () =>
      textTexture(lines, {
        width: 512,
        height: Math.round((512 * size[1]) / size[0]),
        color,
        background,
        font: '800 92px system-ui, sans-serif',
      }),
    [lines, color, background, size],
  );
  return (
    <mesh>
      <planeGeometry args={size} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}

// L'étiquette au-dessus d'un stand : nom de l'indice et état, dessinés sur une toile. Elle est
// dans la scène (et non en HTML par-dessus) : la publication ou un mur la cachent normalement.
function tagTexture(label: string, state: string, stateColor: string, targeted: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = 560;
  canvas.height = 204;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = 'rgba(18, 8, 10, 0.82)';
    context.strokeStyle = targeted ? '#e5383b' : 'rgba(255, 255, 255, 0.22)';
    context.lineWidth = targeted ? 10 : 5;
    context.beginPath();
    context.roundRect(8, 8, 544, 188, 48);
    context.fill();
    context.stroke();
    context.textAlign = 'center';
    context.fillStyle = '#ffffff';
    context.font = '700 64px system-ui, sans-serif';
    context.fillText(label, 280, 98, 500);
    context.fillStyle = stateColor;
    context.font = '600 38px system-ui, sans-serif';
    context.fillText(state.toUpperCase(), 280, 156, 500);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

// Le décor propre à chaque indice : on reconnaît le stand de loin.
function StationProp({ kind }: { kind: ClueKind }) {
  switch (kind) {
    case 'source':
      return (
        <group position={[0, 1.05, 0]}>
          <mesh material={toon('#3d8f7a')}>
            <boxGeometry args={[0.8, 0.48, 0.3]} />
          </mesh>
          <mesh
            material={toon('#1b1014')}
            position={[-0.17, 0, 0.16]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.15, 0.15, 0.03, 24]} />
          </mesh>
          <mesh material={toon('#f2ebe3')} position={[0.22, 0.08, 0.16]}>
            <boxGeometry args={[0.24, 0.12, 0.02]} />
          </mesh>
          <mesh material={toon('#cfc6bd')} position={[0.3, 0.5, 0]} rotation={[0, 0, -0.4]}>
            <cylinderGeometry args={[0.012, 0.012, 0.6, 6]} />
          </mesh>
        </group>
      );
    case 'date':
      return (
        <group position={[0, 1.5, 0]}>
          <mesh material={toon('#8a5a3a')} position={[0, -0.75, -0.03]}>
            <boxGeometry args={[0.08, 1.5, 0.08]} />
          </mesh>
          <mesh material={toon('#e5383b')} position={[0, 0.36, 0]}>
            <boxGeometry args={[0.95, 0.22, 0.05]} />
          </mesh>
          <group position={[0, -0.05, 0.03]}>
            <Sign lines={['LUN.', '12']} color="#1b1014" background="#f2ebe3" size={[0.95, 0.62]} />
          </group>
        </group>
      );
    case 'image':
      return (
        <group position={[0, 0, 0]}>
          {[-0.3, 0.3].map((x) => (
            <mesh
              key={x}
              material={toon('#8a5a3a')}
              position={[x, 0.85, 0]}
              rotation={[0.12, 0, x * -0.3]}
            >
              <boxGeometry args={[0.06, 1.75, 0.06]} />
            </mesh>
          ))}
          <mesh material={toon('#f0a63c')} position={[0, 1.35, 0.1]} rotation={[-0.12, 0, 0]}>
            <boxGeometry args={[0.95, 0.75, 0.05]} />
          </mesh>
          <group position={[0, 1.35, 0.135]} rotation={[-0.12, 0, 0]}>
            <Sign lines={['PHOTO']} color="#f2ebe3" background="#5b7fd1" size={[0.82, 0.62]} />
          </group>
        </group>
      );
    case 'author':
      return (
        <group position={[0, 1.2, 0]}>
          <mesh material={toon('#f2ebe3')}>
            <boxGeometry args={[0.95, 0.62, 0.05]} />
          </mesh>
          <group position={[0, 0, 0.03]}>
            <Sign
              lines={['QUI', 'ÉCRIT ?']}
              color="#f2ebe3"
              background="#7a5bd1"
              size={[0.88, 0.55]}
            />
          </group>
          <mesh material={toon('#8a5a3a')} position={[0, -0.6, -0.02]}>
            <boxGeometry args={[0.07, 1.2, 0.07]} />
          </mesh>
        </group>
      );
    default:
      return (
        <group>
          <mesh material={toon('#2c2f4a')} position={[0, 1.1, -0.35]}>
            <boxGeometry args={[1.6, 2.2, 0.1]} />
          </mesh>
          <mesh material={toon('#e5383b')} position={[0, 2.35, 0]}>
            <boxGeometry args={[1.9, 0.12, 1]} />
          </mesh>
          <group position={[0, 2, -0.29]}>
            <Sign lines={['JOURNAUX']} color="#f2ebe3" background="#e5383b" size={[1.4, 0.36]} />
          </group>
          {[-0.45, 0, 0.45].map((x, index) => (
            <mesh
              key={x}
              material={toon(index === 1 ? '#e6d36a' : '#f2ebe3')}
              position={[x, 0.95 + index * 0.02, 0]}
            >
              <boxGeometry args={[0.38, 0.1 + index * 0.05, 0.5]} />
            </mesh>
          ))}
          <mesh material={toon('#8a5a3a')} position={[0, 0.45, 0]}>
            <boxGeometry args={[1.5, 0.9, 0.6]} />
          </mesh>
        </group>
      );
  }
}

export function ClueStation({
  kind,
  world,
  revealed,
  rating,
  targeted,
}: {
  kind: ClueKind;
  world: World;
  revealed: boolean;
  rating: ClueRating | undefined;
  targeted: boolean;
}) {
  const spot = CLUE_SPOTS[kind];
  const gem = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const hit = useRef<THREE.Mesh>(null);
  const tag = useRef<THREE.Mesh>(null);
  const state = !revealed ? 'À examiner' : rating ? CLUE_RATING_LABELS[rating] : 'Vu';
  const stateColor = !revealed
    ? '#ff9e9a'
    : rating === 'reliable'
      ? '#7fe0b0'
      : rating === 'suspicious'
        ? '#f5c46a'
        : 'rgba(255, 255, 255, 0.7)';
  const tagMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: tagTexture(CLUE_KIND_LABELS[kind], state, stateColor, targeted),
        transparent: true,
        toneMapped: false,
        depthWrite: false,
      }),
    [kind, state, stateColor, targeted],
  );
  useEffect(
    () => () => {
      tagMaterial.map?.dispose();
      tagMaterial.dispose();
    },
    [tagMaterial],
  );
  const gemMaterial = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  const ringMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, depthWrite: false }),
    [],
  );

  useEffect(() => {
    const mesh = hit.current;
    if (!mesh) return;
    world.targets.set(mesh, { kind: 'clue', clue: kind });
    world.obstacles.push({ x: spot[0], z: spot[2], r: 0.9 });
    return () => {
      world.targets.delete(mesh);
      world.obstacles = world.obstacles.filter((item) => item.x !== spot[0] || item.z !== spot[2]);
    };
  }, [world, kind, spot]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // Rouge qui pulse tant que l'indice est caché, couleur de la note ensuite.
    const color = !revealed
      ? new THREE.Color(2.6, 0.45, 0.4)
      : rating === 'reliable'
        ? new THREE.Color(0.4, 2.2, 1.1)
        : rating === 'suspicious'
          ? new THREE.Color(2.4, 1.4, 0.3)
          : new THREE.Color(1.8, 1.6, 1.5);
    const pulse = revealed ? 1 : 0.75 + Math.sin(t * 4) * 0.25;
    gemMaterial.color.copy(color).multiplyScalar(targeted ? 1.5 : pulse);
    ringMaterial.color.copy(color);
    ringMaterial.opacity = revealed ? 0.35 : 0.4 + Math.sin(t * 4) * 0.25;
    if (gem.current) {
      gem.current.rotation.y = t * 1.4;
      gem.current.position.y = 3.05 + Math.sin(t * 2 + spot[2]) * 0.12;
      const scale = THREE.MathUtils.damp(gem.current.scale.x, targeted ? 1.35 : 1, 10, 0.016);
      gem.current.scale.setScalar(scale);
    }
    if (ring.current)
      ring.current.scale.setScalar(1 + (revealed ? 0 : (Math.sin(t * 4) + 1) * 0.08));
  });

  return (
    <group
      position={spot}
      rotation={[0, spot[0] < -1 ? Math.PI / 2.6 : spot[0] > 1 ? -Math.PI / 2.6 : 0, 0]}
    >
      <StationProp kind={kind} />
      <mesh ref={gem} material={gemMaterial}>
        <octahedronGeometry args={[0.22, 0]} />
      </mesh>
      <mesh
        ref={ring}
        material={ringMaterial}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.05, 0]}
      >
        <ringGeometry args={[1.05, 1.2, 48]} />
      </mesh>
      <mesh ref={hit} position={[0, 1.5, 0]} visible={false}>
        <cylinderGeometry args={[1, 1, 3.4, 12]} />
        <meshBasicMaterial />
      </mesh>
      <Billboard position={[0, 3.75, 0]}>
        <mesh ref={tag} material={tagMaterial}>
          <planeGeometry args={[1.7, 0.62]} />
        </mesh>
      </Billboard>
    </group>
  );
}

// ─── La foule du marché ─────────────────────────────────────────────────────────────────────

const STANDING: { position: [number, number, number]; face: number; mood: ChibiMood }[] = [
  { position: [-9.8, 0, 6.5], face: -1.9, mood: 'talk' },
  { position: [-9.6, 0, 3.4], face: -1.2, mood: 'idle' },
  { position: [9.9, 0, -7.2], face: 1.7, mood: 'idle' },
  { position: [-9.7, 0, -10.6], face: -1.5, mood: 'talk' },
  { position: [9.7, 0, -22.5], face: 1.4, mood: 'talk' },
  { position: [-3.4, 0, -29.5], face: 0.6, mood: 'idle' },
  { position: [3.6, 0, -28.8], face: -0.7, mood: 'talk' },
  { position: [11.8, 0, 9], face: Math.PI, mood: 'idle' },
];

function Walker({ seed, x, alarmed }: { seed: number; x: number; alarmed: boolean }) {
  const group = useRef<THREE.Group>(null);
  const look = useMemo(() => villagerLook(seed), [seed]);
  useFrame(({ clock }) => {
    if (!group.current) return;
    // Aller-retour sur le trottoir, avec un demi-tour en douceur.
    const t = clock.elapsedTime * 0.09 + seed;
    const phase = (t % 2) / 2;
    const forward = phase < 0.5;
    const progress = forward ? phase * 2 : (1 - phase) * 2;
    group.current.position.set(x, 0, THREE.MathUtils.lerp(10, -34, progress));
    group.current.rotation.y = THREE.MathUtils.damp(
      group.current.rotation.y,
      forward ? Math.PI : 0,
      6,
      0.016,
    );
  });
  return (
    <group ref={group}>
      <Chibi look={look} mood="walk" alarmed={alarmed} seed={seed} />
    </group>
  );
}

export function Crowd({
  world,
  alarmed,
  cheering,
}: {
  world: World;
  alarmed: boolean;
  cheering: boolean;
}) {
  useEffect(() => {
    const added = STANDING.map(({ position }) => ({ x: position[0], z: position[2], r: 0.45 }));
    world.obstacles.push(...added);
    return () => {
      world.obstacles = world.obstacles.filter((item) => !added.includes(item));
    };
  }, [world]);

  return (
    <group>
      {STANDING.map((person, index) => (
        <Chibi
          key={person.position.join()}
          look={villagerLook(index + 11)}
          mood={cheering && index % 2 === 0 ? 'wave' : person.mood}
          alarmed={alarmed}
          seed={index + 1}
          position={person.position}
          rotation={[0, person.face, 0]}
        />
      ))}
      <Walker seed={31} x={-6.8} alarmed={alarmed} />
      <Walker seed={44} x={7.2} alarmed={alarmed} />
    </group>
  );
}
