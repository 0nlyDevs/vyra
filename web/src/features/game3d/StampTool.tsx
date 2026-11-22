'use client';

import { RoundedBox } from '@react-three/drei';
import { createPortal, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { perAnswer, STAMPS } from './constants';
import { textTexture, toon } from './toon';
import type { World } from './world';

// Le tampon du joueur, son « arme » : un gros tampon encreur couché comme un blaster. Le
// caoutchouc encré est devant (il brille de la couleur choisie et porte la marque), le corps
// rouge cerclé de laiton au milieu, la poignée en bois à l'arrière. Une jauge d'encre sur le
// dessus reprend la couleur. Le même modèle sert en vue subjective et dans la main de l'avatar.

const BRASS = '#e3b25a';

function useStampMaterials(world: World) {
  const marks = useMemo(
    () =>
      perAnswer((answer) =>
        textTexture([STAMPS[answer].mark], {
          width: 256,
          height: 256,
          color: '#fff8ef',
          font: `900 ${STAMPS[answer].mark.length > 2 ? 78 : 130}px system-ui, sans-serif`,
        }),
      ),
    [],
  );
  const materials = useMemo(
    () => ({
      pad: new THREE.MeshToonMaterial({ color: STAMPS.fake.ink }),
      face: new THREE.MeshBasicMaterial({ color: STAMPS.fake.color, toneMapped: false }),
      mark: new THREE.MeshBasicMaterial({ map: marks.fake, transparent: true, toneMapped: false }),
      gauge: new THREE.MeshBasicMaterial({ color: STAMPS.fake.color, toneMapped: false }),
    }),
    [marks],
  );
  useFrame(({ clock }) => {
    const answer = world.selected.value;
    const since = performance.now() / 1000 - world.fired.at;
    const flash = since < 0.25 ? 1 + (1 - since / 0.25) * 2.5 : 1;
    const pulse = 1.25 + Math.sin(clock.elapsedTime * 3) * 0.15;
    materials.pad.color.set(STAMPS[answer].ink);
    materials.face.color.set(STAMPS[answer].color).multiplyScalar(pulse * flash);
    materials.gauge.color.set(STAMPS[answer].color).multiplyScalar(1.8);
    if (materials.mark.map !== marks[answer]) materials.mark.map = marks[answer];
  });
  return materials;
}

// Modèle à l'échelle 1 : environ 45 cm de long, pointé vers -z.
export function StampModel({ world }: { world: World }) {
  const m = useStampMaterials(world);
  return (
    <group>
      {/* Caoutchouc encré et sa face lumineuse portant la marque. */}
      <RoundedBox
        args={[0.24, 0.24, 0.05]}
        radius={0.02}
        smoothness={3}
        position={[0, 0, -0.25]}
        material={m.pad}
      />
      <mesh material={m.face} position={[0, 0, -0.2755]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[0.2, 0.2]} />
      </mesh>
      <mesh material={m.mark} position={[0, 0, -0.277]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[0.2, 0.2]} />
      </mesh>
      {/* Semelle de bois sombre. */}
      <RoundedBox
        args={[0.28, 0.28, 0.05]}
        radius={0.022}
        smoothness={3}
        position={[0, 0, -0.205]}
        material={toon('#5a1a2b')}
      />
      {/* Corps rouge cerclé de laiton. */}
      <mesh material={toon('#e5383b')} position={[0, 0, -0.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.075, 0.105, 0.17, 28]} />
      </mesh>
      {[-0.175, -0.025].map((z) => (
        <mesh key={z} material={toon(BRASS, BRASS, 0.15)} position={[0, 0, z]}>
          <torusGeometry args={[z < -0.1 ? 0.102 : 0.078, 0.014, 10, 32]} />
        </mesh>
      ))}
      {/* Jauge d'encre sur le dessus. */}
      <mesh material={toon('#1b1014')} position={[0, 0.088, -0.1]} rotation={[0.18, 0, 0]}>
        <boxGeometry args={[0.05, 0.02, 0.12]} />
      </mesh>
      <mesh material={m.gauge} position={[0, 0.1, -0.1]} rotation={[0.18, 0, 0]}>
        <boxGeometry args={[0.032, 0.008, 0.1]} />
      </mesh>
      {/* Poignée en bois et pommeau. */}
      <mesh material={toon('#6e4024')} position={[0, 0, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.042, 0.05, 0.16, 20]} />
      </mesh>
      <mesh material={toon('#7a4a2a')} position={[0, 0, 0.16]}>
        <sphereGeometry args={[0.072, 24, 18]} />
      </mesh>
      <mesh material={toon('#e5383b')} position={[0, 0, 0.225]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.02, 16]} />
      </mesh>
    </group>
  );
}

// Vue subjective : le tampon en bas à droite de l'écran. Il se balance en marchant, suit la
// souris avec un léger retard, frappe vers l'avant au tir et fait un tour sur lui-même quand on
// change d'encre.
export function StampTool({ world, visible }: { world: World; visible: boolean }) {
  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);
  const holder = useRef<THREE.Group>(null);
  const tool = useRef<THREE.Group>(null);
  const muzzle = useRef<THREE.Object3D>(null);
  const last = useRef({ yaw: 0, pitch: 0 });
  const sway = useRef({ x: 0, y: 0 });

  // La caméra doit être dans la scène pour que l'outil, qui lui est attaché, soit dessiné.
  useEffect(() => {
    scene.add(camera);
    return () => {
      scene.remove(camera);
    };
  }, [scene, camera]);

  useFrame(({ clock }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const t = clock.elapsedTime;
    const now = performance.now() / 1000;
    if (!holder.current || !tool.current) return;
    holder.current.visible = visible;
    if (muzzle.current && visible) muzzle.current.getWorldPosition(world.muzzle);

    const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    const dYaw = euler.y - last.current.yaw;
    const dPitch = euler.x - last.current.pitch;
    last.current = { yaw: euler.y, pitch: euler.x };
    const clamp = (value: number) => THREE.MathUtils.clamp(value, -0.2, 0.2);
    sway.current.x = THREE.MathUtils.damp(sway.current.x + clamp(dYaw) * 0.5, 0, 8, delta);
    sway.current.y = THREE.MathUtils.damp(sway.current.y + clamp(dPitch) * 0.5, 0, 8, delta);

    const speed = world.speed.value;
    const walkX = Math.sin(t * 7.2) * 0.014 * speed;
    const walkY = Math.abs(Math.cos(t * 7.2)) * 0.018 * speed;
    const breathe = Math.sin(t * 1.6) * 0.004;

    // Coup de tampon : frappe rapide vers l'avant puis retour amorti.
    const sinceFire = now - world.fired.at;
    const progress = Math.min(1, sinceFire / 0.32);
    const thrust = sinceFire < 0.32 ? Math.sin(progress * Math.PI) * (1 - progress * 0.5) : 0;
    // Changement d'encre : le tampon pivote d'un tour complet.
    const sinceSwap = now - world.swapped.at;
    const spin = sinceSwap < 0.45 ? (1 - (1 - sinceSwap / 0.45) ** 3) * Math.PI * 2 : 0;

    holder.current.position.set(
      0.3 + walkX - sway.current.x * 0.35 - thrust * 0.1,
      -0.2 - walkY + breathe + sway.current.y * 0.3 + thrust * 0.04,
      -0.86 - thrust * 0.3,
    );
    // Vu de trois quarts : on voit le flanc, la jauge et la face encrée, pas le pommeau de face.
    tool.current.rotation.set(
      0.12 + sway.current.y * 0.6 - thrust * 0.1,
      0.38 + sway.current.x * 0.6 - thrust * 0.3,
      -0.08 + spin,
    );
  });

  return createPortal(
    <group ref={holder} scale={0.85}>
      <pointLight position={[-0.15, 0.25, 0.1]} intensity={0.6} distance={1.4} color="#ffd6b0" />
      <group ref={tool}>
        <StampModel world={world} />
        <object3D ref={muzzle} position={[0, 0, -0.3]} />
      </group>
    </group>,
    camera,
  );
}

// Troisième personne : le tampon dans la main de l'avatar, plus petit. Il donne aussi le point
// de départ des tirs.
export function HeldStamp({ world }: { world: World }) {
  const muzzle = useRef<THREE.Object3D>(null);
  useFrame(() => {
    if (world.view.value === 'third') muzzle.current?.getWorldPosition(world.muzzle);
  });
  return (
    <group scale={0.62} position={[0, 0, -0.06]}>
      <StampModel world={world} />
      <object3D ref={muzzle} position={[0, 0, -0.3]} />
    </group>
  );
}
