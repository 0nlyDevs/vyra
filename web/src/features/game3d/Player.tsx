'use client';

import { PointerLockControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { type RefObject, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { gameAudio } from './audio';
import { EYE_HEIGHT, PLAYER_START, RUMOR_SPOT, WALK_BOUNDS } from './constants';
import type { LockControls, View, World } from './world';

// Déplacement : ZQSD ou WASD (et les flèches), Maj pour courir. On accélère et on freine en
// douceur, la tête se balance un peu, les pas s'entendent. La caméra est soit aux yeux du joueur,
// soit derrière son épaule (troisième personne), avec un fondu de l'une à l'autre.

const WALK_SPEED = 4.2;
const RUN_SPEED = 7.2;
const PLAYER_RADIUS = 0.45;
const SHOULDER = { height: 1.75, back: 3.6, side: 0.8 };

// Caméra à la troisième personne : derrière l'épaule droite, sans passer sous le sol ni dans les façades.
function shoulderCamera(feet: THREE.Vector3, quaternion: THREE.Quaternion, out: THREE.Vector3) {
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(quaternion);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion).setY(0).normalize();
  out
    .copy(feet)
    .setY(SHOULDER.height)
    .addScaledVector(forward, -SHOULDER.back)
    .addScaledVector(right, SHOULDER.side);
  out.y = Math.max(out.y, 0.45);
  out.x = THREE.MathUtils.clamp(out.x, -14.5, 14.5);
  out.z = Math.min(out.z, 16);
  return out;
}

const KEYS = {
  forward: ['KeyW', 'KeyZ', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'KeyQ', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  run: ['ShiftLeft', 'ShiftRight'],
};

export type CameraMode = 'menu' | 'intro' | 'play' | 'summary';

export function Player({
  world,
  view,
  mode,
  active,
  controlsRef,
  onLockChange,
  onIntroDone,
}: {
  world: World;
  view: View;
  mode: CameraMode;
  // Faux quand un panneau est ouvert : on ne bouge plus.
  active: boolean;
  controlsRef: RefObject<LockControls | null>;
  onLockChange: (locked: boolean) => void;
  onIntroDone: () => void;
}) {
  const camera = useThree((state) => state.camera);
  const pressed = useRef(new Set<string>());
  const velocity = useRef(new THREE.Vector3());
  const bob = useRef({ phase: 0, lastStep: 0 });
  const intro = useRef({ start: 0, from: new THREE.Vector3(), fromQuat: new THREE.Quaternion() });
  const blend = useRef(view === 'third' ? 1 : 0);
  const introDone = useRef(onIntroDone);
  introDone.current = onIntroDone;

  useEffect(() => {
    const down = (event: KeyboardEvent) => pressed.current.add(event.code);
    const up = (event: KeyboardEvent) => pressed.current.delete(event.code);
    const clear = () => pressed.current.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
    };
  }, []);

  // Début du plan d'ouverture : la caméra part de là où elle est.
  useEffect(() => {
    if (mode !== 'intro') return;
    intro.current.start = performance.now();
    intro.current.from.copy(camera.position);
    intro.current.fromQuat.copy(camera.quaternion);
  }, [mode, camera]);

  useFrame(({ clock }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const t = clock.elapsedTime;

    if (mode === 'menu') {
      // Plan large sur les deux mascottes, qui respire doucement.
      camera.position.lerp(
        new THREE.Vector3(Math.sin(t * 0.2) * 0.6, 2.3, 7.2),
        1 - Math.exp(-delta * 2),
      );
      camera.lookAt(0, 1.05, 1.4);
      return;
    }

    if (mode === 'intro') {
      // Plan grue : on descend jusqu'aux yeux du joueur, face à la rue.
      const progress = Math.min(1, (performance.now() - intro.current.start) / 2600);
      const eased = 1 - (1 - progress) ** 3;
      const feet = new THREE.Vector3(PLAYER_START[0], 0, PLAYER_START[2]);
      world.player.position.copy(feet);
      // Matrix4.lookAt suit la convention des caméras (on regarde vers -z), contrairement à Object3D.lookAt.
      const look = {
        position: new THREE.Vector3(PLAYER_START[0], EYE_HEIGHT, PLAYER_START[2]),
        quaternion: new THREE.Quaternion(),
      };
      look.quaternion.setFromRotationMatrix(
        new THREE.Matrix4().lookAt(
          look.position,
          new THREE.Vector3(RUMOR_SPOT[0], EYE_HEIGHT - 0.1, RUMOR_SPOT[2]),
          new THREE.Vector3(0, 1, 0),
        ),
      );
      const target =
        view === 'third'
          ? shoulderCamera(feet, look.quaternion, new THREE.Vector3())
          : look.position.clone();
      blend.current = view === 'third' ? 1 : 0;
      const lift = Math.sin(progress * Math.PI) * 3.5;
      camera.position.lerpVectors(intro.current.from, target, eased);
      camera.position.y += lift;
      camera.quaternion.slerpQuaternions(intro.current.fromQuat, look.quaternion, eased);
      if (progress >= 1) {
        velocity.current.set(0, 0, 0);
        introDone.current();
      }
      return;
    }

    if (mode === 'summary') {
      // Tour lent autour de la mascotte qui fête son score.
      const angle = t * 0.25;
      camera.position.lerp(
        new THREE.Vector3(
          RUMOR_SPOT[0] + Math.sin(angle) * 4.2,
          2.1,
          RUMOR_SPOT[2] + 2 + Math.cos(angle) * 4.2,
        ),
        1 - Math.exp(-delta * 2),
      );
      camera.lookAt(RUMOR_SPOT[0], 1, RUMOR_SPOT[2] + 2);
      return;
    }

    // Jeu : marche, caméra aux yeux ou derrière l'épaule.
    const is = (codes: string[]) => codes.some((code) => pressed.current.has(code));
    const moving = active && (controlsRef.current?.isLocked ?? false);
    const input = new THREE.Vector3(
      Number(moving && is(KEYS.right)) - Number(moving && is(KEYS.left)),
      0,
      Number(moving && is(KEYS.back)) - Number(moving && is(KEYS.forward)),
    );
    if (input.lengthSq() > 0) input.normalize();
    const speed = moving && is(KEYS.run) ? RUN_SPEED : WALK_SPEED;
    const yaw = new THREE.Euler(
      0,
      new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ').y,
      0,
    );
    const wanted = input.applyEuler(yaw).multiplyScalar(speed);
    velocity.current.x = THREE.MathUtils.damp(velocity.current.x, wanted.x, 10, delta);
    velocity.current.z = THREE.MathUtils.damp(velocity.current.z, wanted.z, 10, delta);

    const next = world.player.position.clone().addScaledVector(velocity.current, delta);
    // Obstacles ronds : on glisse le long d'eux plutôt que de s'arrêter net.
    for (const obstacle of world.obstacles) {
      const dx = next.x - obstacle.x;
      const dz = next.z - obstacle.z;
      const distance = Math.hypot(dx, dz);
      const minimum = obstacle.r + PLAYER_RADIUS;
      if (distance < minimum && distance > 0.0001) {
        next.x = obstacle.x + (dx / distance) * minimum;
        next.z = obstacle.z + (dz / distance) * minimum;
      }
    }
    next.x = THREE.MathUtils.clamp(next.x, WALK_BOUNDS.minX, WALK_BOUNDS.maxX);
    next.z = THREE.MathUtils.clamp(next.z, WALK_BOUNDS.minZ, WALK_BOUNDS.maxZ);

    const horizontal = Math.hypot(velocity.current.x, velocity.current.z);
    world.speed.value = Math.min(1, horizontal / WALK_SPEED);
    bob.current.phase += delta * horizontal * 2.1;
    const bobY = Math.sin(bob.current.phase * 2) * 0.045 * world.speed.value;
    world.player.position.set(next.x, 0, next.z);
    blend.current = THREE.MathUtils.damp(blend.current, view === 'third' ? 1 : 0, 7, delta);
    const eyes = new THREE.Vector3(next.x, EYE_HEIGHT + bobY, next.z);
    const shoulder = shoulderCamera(world.player.position, camera.quaternion, new THREE.Vector3());
    shoulder.y += bobY * 0.4;
    camera.position.lerpVectors(eyes, shoulder, blend.current);

    // Un pas à chaque creux du balancement.
    const stepIndex = Math.floor(bob.current.phase / Math.PI);
    if (horizontal > 0.8 && stepIndex !== bob.current.lastStep) {
      bob.current.lastStep = stepIndex;
      gameAudio.step();
    }
  });

  return (
    <PointerLockControls
      // Les contrôles de drei exposent bien isLocked, lock() et unlock().
      ref={controlsRef as never}
      // Pas de verrouillage automatique au clic : Game3D le demande lui-même (calque de pause).
      selector="#game3d-no-auto-lock"
      enabled={mode === 'play'}
      onLock={() => onLockChange(true)}
      onUnlock={() => onLockChange(false)}
      pointerSpeed={0.85}
    />
  );
}
