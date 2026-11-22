'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Chibi, type ChibiLook, type ChibiMood } from './Chibi';
import { HeldStamp } from './StampTool';
import type { World } from './world';

// Les tirs : un disque d'encre lumineux file du tampon au point visé, laisse une traînée, puis
// éclabousse en anneau à l'impact. Huit tirs au plus en même temps, objets réutilisés.

const POOL = 8;
const LIFE = 0.9;
const SPEED = 55;

export function flightTime(shot: { from: THREE.Vector3; to: THREE.Vector3 }) {
  return THREE.MathUtils.clamp(shot.from.distanceTo(shot.to) / SPEED, 0.06, 0.4);
}

export function Shots({ world }: { world: World }) {
  const slots = useRef<(THREE.Group | null)[]>([]);
  const materials = useMemo(
    () =>
      Array.from({ length: POOL }, () => ({
        core: new THREE.MeshBasicMaterial({ toneMapped: false }),
        trail: new THREE.MeshBasicMaterial({
          toneMapped: false,
          transparent: true,
          depthWrite: false,
        }),
        splash: new THREE.MeshBasicMaterial({
          toneMapped: false,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      })),
    [],
  );

  useFrame(() => {
    const now = performance.now() / 1000;
    world.shots = world.shots.filter((shot) => now - shot.at < LIFE).slice(-POOL);
    for (let index = 0; index < POOL; index++) {
      const slot = slots.current[index];
      const shot = world.shots[index];
      const material = materials[index];
      if (!slot || !material) continue;
      slot.visible = Boolean(shot);
      if (!shot) continue;
      const [core, trail, splash] = slot.children as [
        THREE.Object3D,
        THREE.Object3D,
        THREE.Object3D,
      ];
      const age = now - shot.at;
      const flight = flightTime(shot);
      const progress = Math.min(1, age / flight);
      const direction = shot.to.clone().sub(shot.from).normalize();
      const color = new THREE.Color(shot.color);

      // Le disque en vol, face à sa direction, qui tourne sur lui-même.
      core.visible = progress < 1;
      core.position.lerpVectors(shot.from, shot.to, progress);
      core.lookAt(shot.to);
      core.rotateZ(age * 20);
      material.core.color.copy(color).multiplyScalar(2.6);

      // La traînée : un fuseau étiré entre le départ (ou un peu derrière le disque) et le disque.
      const tail = Math.max(0, progress - 0.35);
      const start = shot.from.clone().lerp(shot.to, tail);
      const end = core.position;
      const length = start.distanceTo(end);
      trail.visible = length > 0.01 && age < flight + 0.15;
      trail.position.lerpVectors(start, end, 0.5);
      trail.lookAt(end);
      trail.scale.set(1, 1, Math.max(0.01, length));
      material.trail.color.copy(color).multiplyScalar(2);
      material.trail.opacity = Math.max(0, 0.75 - Math.max(0, age - flight) * 5);

      // L'éclaboussure à l'impact.
      const sinceImpact = age - flight;
      splash.visible = sinceImpact >= 0;
      if (sinceImpact >= 0) {
        splash.position.copy(shot.to).addScaledVector(direction, -0.05);
        splash.lookAt(shot.from);
        splash.scale.setScalar((shot.hit ? 0.5 : 0.3) + sinceImpact * (shot.hit ? 4 : 2.4));
        material.splash.color.copy(color).multiplyScalar(2.2);
        material.splash.opacity = Math.max(0, 1 - sinceImpact / (LIFE - flight));
      }
    }
  });

  return (
    <group>
      {materials.map((material, index) => (
        <group
          // biome-ignore lint/suspicious/noArrayIndexKey: emplacements fixes, réutilisés.
          key={index}
          ref={(node) => {
            slots.current[index] = node;
          }}
          visible={false}
        >
          <mesh material={material.core} rotation={[0, 0, 0]}>
            <cylinderGeometry args={[0.13, 0.13, 0.04, 6]} />
          </mesh>
          <mesh material={material.trail}>
            <boxGeometry args={[0.05, 0.05, 1]} />
          </mesh>
          <mesh material={material.splash}>
            <ringGeometry args={[0.55, 0.75, 6]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// L'avatar du joueur en vue à la troisième personne : il suit la position du joueur, se tourne
// dans le sens du regard, marche quand on avance et tend son tampon à chaque tir.
export function PlayerAvatar({
  world,
  look,
  visible,
}: {
  world: World;
  look: ChibiLook;
  visible: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const mood = useRef<ChibiMood>('idle');
  useFrame(({ camera }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    if (!group.current) return;
    group.current.visible = visible && world.view.value === 'third';
    group.current.position.copy(world.player.position);
    const yaw = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ').y + Math.PI;
    // Rotation la plus courte vers le regard.
    const current = group.current.rotation.y;
    const diff = Math.atan2(Math.sin(yaw - current), Math.cos(yaw - current));
    group.current.rotation.y = current + diff * (1 - Math.exp(-delta * 14));
    mood.current = world.speed.value > 0.2 ? 'walk' : 'idle';
  });
  return (
    <group ref={group} visible={false}>
      <Chibi
        look={look}
        moodRef={mood}
        seed={9}
        scale={1.1}
        held={<HeldStamp world={world} />}
        punch={world.fired}
      />
    </group>
  );
}
