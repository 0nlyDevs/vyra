'use client';

import { Outlines } from '@react-three/drei';
import { type ThreeElements, useFrame } from '@react-three/fiber';
import { type ReactNode, type RefObject, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { toon } from './toon';

// Les personnages « chibi » du jeu, dessinés en code : grosse tête, petit corps, ombrage dessin
// animé et contour. Deux mascottes (la vérificatrice et le vérificateur, écharpe rouge) et des
// passants aux tenues variées. Les humeurs passent de l'une à l'autre en douceur.

export type ChibiMood = 'idle' | 'walk' | 'happy' | 'sad' | 'talk' | 'wave';
export type HairStyle = 'pigtails' | 'bob' | 'spiky' | 'short' | 'bun' | 'curly';

export type ChibiLook = {
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  top: string;
  bottom: string;
  shoes: string;
  skirt?: boolean;
  scarf?: string;
  cap?: string;
  glasses?: boolean;
};

export const MASCOTS: Record<'girl' | 'boy', ChibiLook> = {
  girl: {
    skin: '#c98a5e',
    hair: '#2a1714',
    hairStyle: 'pigtails',
    top: '#f2ebe3',
    bottom: '#2c2f4a',
    shoes: '#e5383b',
    skirt: true,
    scarf: '#e5383b',
  },
  boy: {
    skin: '#a8694a',
    hair: '#1b1210',
    hairStyle: 'spiky',
    top: '#2c2f4a',
    bottom: '#3d4566',
    shoes: '#f2ebe3',
    scarf: '#e5383b',
    glasses: true,
  },
};

const SKINS = ['#e0ac80', '#c98a5e', '#a8694a', '#7d4a33', '#f1c9a5'];
const HAIRS = ['#1b1210', '#3b2418', '#5a3a22', '#2a1714', '#8a5a3a', '#cfc6bd'];
const TOPS = ['#f0a63c', '#3d8f7a', '#5b7fd1', '#c75b8a', '#e6d36a', '#7a5bd1', '#e07a4f'];
const BOTTOMS = ['#2c2f4a', '#4a3b2c', '#3d4566', '#5c2c3a', '#2f4a3a'];
const STYLES: HairStyle[] = ['bob', 'short', 'bun', 'curly', 'spiky', 'pigtails'];

// Un passant au hasard, mais stable pour une même graine.
export function villagerLook(seed: number): ChibiLook {
  const pick = <T,>(list: T[], salt: number) =>
    list[
      Math.floor(Math.abs(Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453) % list.length)
    ] as T;
  const hairStyle = pick(STYLES, 3);
  return {
    skin: pick(SKINS, 1),
    hair: pick(HAIRS, 2),
    hairStyle,
    top: pick(TOPS, 4),
    bottom: pick(BOTTOMS, 5),
    shoes: pick(['#2a1714', '#f2ebe3', '#3b2418', '#5b7fd1'], 6),
    skirt: hairStyle === 'pigtails' || hairStyle === 'bun' ? seed % 2 === 0 : false,
    cap: seed % 5 === 0 ? pick(TOPS, 7) : undefined,
    glasses: seed % 4 === 1,
  };
}

const OUTLINE = '#120809';
const sphere = new THREE.SphereGeometry(1, 32, 24);
const lowSphere = new THREE.SphereGeometry(1, 16, 12);
const capsule = new THREE.CapsuleGeometry(1, 1, 6, 16);
const cone = new THREE.ConeGeometry(1, 1, 16);
const torus = new THREE.TorusGeometry(1, 0.32, 10, 24);
const box = new THREE.BoxGeometry(1, 1, 1);
const cylinder = new THREE.CylinderGeometry(1, 1, 1, 20);

function Hair({ look }: { look: ChibiLook }) {
  const material = toon(look.hair);
  const outline = <Outlines thickness={0.012} color={OUTLINE} />;
  const cap = (
    <mesh
      geometry={sphere}
      material={material}
      position={[0, 0.07, -0.03]}
      scale={[0.37, 0.33, 0.37]}
    >
      {outline}
    </mesh>
  );
  // Frange sur le front.
  const fringe = (
    <mesh
      geometry={sphere}
      material={material}
      position={[0, 0.2, 0.17]}
      scale={[0.3, 0.12, 0.16]}
    />
  );
  switch (look.hairStyle) {
    case 'pigtails':
      return (
        <group>
          {cap}
          {fringe}
          {[-1, 1].map((side) => (
            <group key={side} position={[side * 0.36, -0.02, -0.05]}>
              <mesh
                geometry={sphere}
                material={material}
                position={[side * 0.06, -0.1, 0]}
                scale={[0.12, 0.2, 0.12]}
              >
                {outline}
              </mesh>
              <mesh
                geometry={torus}
                material={toon(look.scarf ?? '#e5383b')}
                rotation={[0, Math.PI / 2, 0]}
                scale={0.06}
              />
            </group>
          ))}
        </group>
      );
    case 'bun':
      return (
        <group>
          {cap}
          {fringe}
          <mesh geometry={sphere} material={material} position={[0, 0.36, -0.12]} scale={0.15}>
            {outline}
          </mesh>
        </group>
      );
    case 'bob':
      return (
        <group>
          <mesh
            geometry={sphere}
            material={material}
            position={[0, 0.02, -0.04]}
            scale={[0.4, 0.38, 0.39]}
          >
            {outline}
          </mesh>
          {fringe}
        </group>
      );
    case 'curly':
      return (
        <group>
          {cap}
          {Array.from({ length: 9 }, (_, index) => {
            const angle = (index / 9) * Math.PI * 2;
            return (
              <mesh
                key={angle}
                geometry={lowSphere}
                material={material}
                position={[
                  Math.cos(angle) * 0.25,
                  0.25 + Math.sin(index) * 0.04,
                  Math.sin(angle) * 0.22 - 0.03,
                ]}
                scale={0.11}
              />
            );
          })}
        </group>
      );
    case 'spiky':
      return (
        <group>
          {cap}
          {[-0.16, -0.05, 0.06, 0.16].map((x, index) => (
            <mesh
              key={x}
              geometry={cone}
              material={material}
              position={[x, 0.33, 0.05 - index * 0.02]}
              rotation={[0.5, 0, x * -1.6]}
              scale={[0.08, 0.2, 0.08]}
            />
          ))}
        </group>
      );
    default:
      return (
        <group>
          {cap}
          {fringe}
        </group>
      );
  }
}

export function Chibi({
  look,
  mood = 'idle',
  moodRef,
  phone = false,
  held,
  punch,
  alarmed = false,
  seed = 0,
  scale = 1,
  ...props
}: {
  look: ChibiLook;
  mood?: ChibiMood;
  // Pour changer d'humeur depuis la boucle d'animation, sans rendu React.
  moodRef?: RefObject<ChibiMood>;
  phone?: boolean;
  // Objet tenu dans la main droite, bras tendu devant soi (le tampon de l'avatar).
  held?: ReactNode;
  // Dernier coup de tampon : le bras se détend vers l'avant.
  punch?: { at: number };
  alarmed?: boolean;
  seed?: number;
  scale?: number;
} & Omit<ThreeElements['group'], 'scale'>) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const alarm = useRef<THREE.Group>(null);
  const state = useRef({
    jump: 0,
    headTilt: 0,
    armL: 0.15,
    armR: 0.15,
    legSwing: 0,
    blinkAt: 2 + seed,
  });
  const skin = toon(look.skin);
  const phoneScreen = useMemo(() => toon('#1a1a22', '#ffcf8a', 0.9), []);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime + seed * 1.7;
    const current = moodRef?.current ?? mood;
    const s = state.current;
    const damp = (from: number, to: number, speed = 8) =>
      THREE.MathUtils.damp(from, to, speed, delta);

    const walking = current === 'walk';
    const happy = current === 'happy' || current === 'wave';
    const sad = current === 'sad';

    s.legSwing = damp(s.legSwing, walking ? Math.sin(t * 9) * 0.65 : 0, 12);
    const jumpTarget =
      current === 'happy'
        ? Math.abs(Math.sin(t * 6)) * 0.28
        : walking
          ? Math.abs(Math.sin(t * 9)) * 0.05
          : 0;
    s.jump = damp(s.jump, jumpTarget, 14);
    s.headTilt = damp(
      s.headTilt,
      sad ? 0.38 : current === 'talk' ? Math.sin(t * 5) * 0.08 : Math.sin(t * 1.3) * 0.04,
      6,
    );
    const holding = phone || held !== undefined;
    const sincePunch = punch ? performance.now() / 1000 - punch.at : 10;
    const thrust = sincePunch < 0.3 ? Math.sin((sincePunch / 0.3) * Math.PI) * 0.45 : 0;
    const armUp = happy ? 2.6 + Math.sin(t * (current === 'wave' ? 10 : 12)) * 0.25 : 0;
    s.armL = damp(
      s.armL,
      happy && current === 'happy'
        ? armUp
        : walking
          ? -s.legSwing * 0.9
          : sad
            ? 0.05
            : 0.15 + Math.sin(t * 2) * 0.04,
      10,
    );
    s.armR = damp(
      s.armR,
      holding
        ? 1.25 + thrust
        : happy
          ? armUp
          : walking
            ? s.legSwing * 0.9
            : sad
              ? 0.05
              : 0.15 + Math.sin(t * 2 + 1) * 0.04,
      10,
    );

    if (root.current) root.current.position.y = s.jump;
    if (body.current) {
      const breathe = 1 + Math.sin(t * 2.4) * 0.015;
      body.current.scale.set(1, breathe, 1);
    }
    if (head.current) {
      head.current.rotation.x = s.headTilt;
      head.current.rotation.z = Math.sin(t * 0.9) * 0.05;
    }
    if (leftArm.current) leftArm.current.rotation.z = s.armL;
    if (rightArm.current) {
      rightArm.current.rotation.z = -s.armR * (phone ? 0.25 : held !== undefined ? 0.1 : 1);
      rightArm.current.rotation.x = holding ? -s.armR : 0;
    }
    if (leftLeg.current) leftLeg.current.rotation.x = s.legSwing;
    if (rightLeg.current) rightLeg.current.rotation.x = -s.legSwing;

    // Clignement des yeux, de temps en temps.
    if (eyes.current) {
      const blinking = t > s.blinkAt && t < s.blinkAt + 0.12;
      if (t > s.blinkAt + 0.12) s.blinkAt = t + 2 + Math.random() * 3;
      eyes.current.scale.y = damp(eyes.current.scale.y, blinking ? 0.1 : 1, 40);
    }
    if (alarm.current) {
      alarm.current.visible = alarmed;
      alarm.current.position.y = 1.62 + Math.sin(t * 6) * 0.04;
      alarm.current.rotation.y = t * 2;
    }
  });

  const outline = <Outlines thickness={0.015} color={OUTLINE} />;

  return (
    <group {...props} scale={scale}>
      <group ref={root}>
        {/* Jambes et chaussures. */}
        {[
          [-1, leftLeg],
          [1, rightLeg],
        ].map(([side, ref]) => (
          <group
            key={side as number}
            ref={ref as RefObject<THREE.Group>}
            position={[(side as number) * 0.1, 0.32, 0]}
          >
            <mesh
              geometry={capsule}
              material={toon(look.bottom)}
              position={[0, -0.12, 0]}
              scale={[0.065, 0.1, 0.065]}
            />
            <mesh
              geometry={sphere}
              material={toon(look.shoes)}
              position={[0, -0.28, 0.035]}
              scale={[0.085, 0.06, 0.12]}
            >
              {outline}
            </mesh>
          </group>
        ))}

        {/* Corps. */}
        <group ref={body} position={[0, 0.33, 0]}>
          <mesh
            geometry={capsule}
            material={toon(look.top)}
            position={[0, 0.2, 0]}
            scale={[0.17, 0.1, 0.14]}
          >
            {outline}
          </mesh>
          {look.skirt ? (
            <mesh
              geometry={cone}
              material={toon(look.bottom)}
              position={[0, 0.05, 0]}
              scale={[0.22, 0.2, 0.2]}
            >
              {outline}
            </mesh>
          ) : (
            <mesh
              geometry={cylinder}
              material={toon(look.bottom)}
              position={[0, 0.04, 0]}
              scale={[0.165, 0.1, 0.135]}
            />
          )}
          {look.scarf && (
            <group position={[0, 0.39, 0]}>
              <mesh
                geometry={torus}
                material={toon(look.scarf)}
                rotation={[Math.PI / 2, 0, 0]}
                scale={[0.15, 0.13, 0.15]}
              >
                {outline}
              </mesh>
              <mesh
                geometry={box}
                material={toon(look.scarf)}
                position={[0.08, -0.1, 0.12]}
                rotation={[0.2, 0, 0.25]}
                scale={[0.07, 0.18, 0.03]}
              />
            </group>
          )}
          {/* Bras, attachés aux épaules. */}
          <group ref={leftArm} position={[-0.19, 0.34, 0]}>
            <mesh
              geometry={capsule}
              material={toon(look.top)}
              position={[-0.02, -0.11, 0]}
              scale={[0.05, 0.08, 0.05]}
            />
            <mesh geometry={sphere} material={skin} position={[-0.03, -0.24, 0]} scale={0.055} />
          </group>
          <group ref={rightArm} position={[0.19, 0.34, 0]}>
            <mesh
              geometry={capsule}
              material={toon(look.top)}
              position={[0.02, -0.11, 0]}
              scale={[0.05, 0.08, 0.05]}
            />
            <mesh geometry={sphere} material={skin} position={[0.03, -0.24, 0]} scale={0.055} />
            {held !== undefined && (
              <group position={[0.03, -0.27, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                {held}
              </group>
            )}
            {phone && (
              <group position={[0.03, -0.3, 0.04]} rotation={[1.4, 0, 0]}>
                <mesh geometry={box} material={toon('#1a1a22')} scale={[0.09, 0.16, 0.015]} />
                <mesh
                  geometry={box}
                  material={phoneScreen}
                  position={[0, 0, 0.009]}
                  scale={[0.075, 0.135, 0.002]}
                />
              </group>
            )}
          </group>
        </group>

        {/* Tête. */}
        <group ref={head} position={[0, 1.02, 0]}>
          <mesh geometry={sphere} material={skin} scale={[0.34, 0.31, 0.32]}>
            {outline}
          </mesh>
          {/* Oreilles. */}
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              geometry={lowSphere}
              material={skin}
              position={[side * 0.33, -0.02, 0]}
              scale={[0.05, 0.07, 0.04]}
            />
          ))}
          <group ref={eyes} position={[0, -0.01, 0.285]}>
            {[-1, 1].map((side) => (
              <group key={side} position={[side * 0.11, 0, 0]}>
                <mesh geometry={sphere} material={toon('#1b1014')} scale={[0.045, 0.065, 0.02]} />
                <mesh
                  geometry={lowSphere}
                  material={toon('#ffffff', '#ffffff', 0.6)}
                  position={[0.015, 0.025, 0.015]}
                  scale={0.014}
                />
              </group>
            ))}
          </group>
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              geometry={lowSphere}
              material={toon('#ff8a8a')}
              position={[side * 0.19, -0.09, 0.25]}
              scale={[0.045, 0.022, 0.01]}
            />
          ))}
          <mesh
            geometry={torus}
            material={toon('#5a1a2b')}
            position={[0, -0.12, 0.29]}
            rotation={[0, 0, Math.PI]}
            scale={[0.035, 0.025, 0.02]}
          />
          {look.glasses && (
            <group position={[0, 0, 0.3]}>
              {[-1, 1].map((side) => (
                <mesh
                  key={side}
                  geometry={torus}
                  material={toon('#120809')}
                  position={[side * 0.11, 0, 0]}
                  scale={0.068}
                />
              ))}
            </group>
          )}
          <Hair look={look} />
          {look.cap && (
            <group position={[0, 0.2, 0]}>
              <mesh geometry={sphere} material={toon(look.cap)} scale={[0.36, 0.2, 0.36]}>
                {outline}
              </mesh>
              <mesh
                geometry={cylinder}
                material={toon(look.cap)}
                position={[0, -0.02, 0.28]}
                scale={[0.2, 0.02, 0.14]}
              />
            </group>
          )}
        </group>

        {/* Point d'exclamation rouge : la rumeur a touché ce passant. */}
        <group ref={alarm} visible={false}>
          <mesh
            geometry={capsule}
            material={toon('#e5383b', '#e5383b', 1.6)}
            position={[0, 0.12, 0]}
            scale={[0.045, 0.07, 0.045]}
          />
          <mesh
            geometry={lowSphere}
            material={toon('#e5383b', '#e5383b', 1.6)}
            position={[0, -0.05, 0]}
            scale={0.045}
          />
        </group>
      </group>
    </group>
  );
}
