'use client';

import { Clone, Sparkles, Stars, useGLTF } from '@react-three/drei';
import type { ThreeElements } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { CITY_SCALE, PALETTE, TILE } from './constants';
import { stripeTexture, toon, toonGradient } from './toon';

// La rue du marché : les bâtiments, la route et le mobilier viennent du pack libre KayKit City
// Builder Bits (CC0, Kay Lousberg), passés en ombrage dessin animé. Les étals, les guirlandes et
// le ciel sont faits ici.

const MODELS = [
  'base',
  'road_straight',
  'road_straight_crossing',
  'building_A',
  'building_B',
  'building_C',
  'building_D',
  'building_E',
  'building_F',
  'building_G',
  'building_H',
  'streetlight',
  'bench',
  'bush',
  'box_A',
  'box_B',
  'car_taxi',
  'car_hatchback',
  'car_sedan',
  'dumpster',
  'firehydrant',
  'trash_A',
  'watertower',
] as const;
type ModelName = (typeof MODELS)[number];

const url = (name: ModelName) => `/game/city/${name}.gltf`;
for (const name of MODELS) useGLTF.preload(url(name), false);

const converted = new WeakMap<THREE.Object3D, THREE.Object3D>();
// Un modèle KayKit, une seule fois converti en matériaux « dessin animé ».
function useToonScene(name: ModelName) {
  const { scene } = useGLTF(url(name), false);
  return useMemo(() => {
    const cached = converted.get(scene);
    if (cached) return cached;
    const copy = scene.clone(true);
    copy.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const source = object.material as THREE.MeshStandardMaterial;
        object.material = new THREE.MeshToonMaterial({
          map: source.map,
          color: source.color,
          gradientMap: toonGradient(),
        });
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    converted.set(scene, copy);
    return copy;
  }, [scene]);
}

type GroupProps = ThreeElements['group'];

function Model({ name, ...props }: { name: ModelName } & GroupProps) {
  const object = useToonScene(name);
  return (
    <group {...props}>
      <Clone object={object} scale={CITY_SCALE} />
    </group>
  );
}

// Le ciel du crépuscule : nuit rouge en haut, horizon orangé, comme la lueur de l'accueil.
function SkyDome() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          top: { value: new THREE.Color(PALETTE.night) },
          middle: { value: new THREE.Color(PALETTE.dusk) },
          horizon: { value: new THREE.Color(PALETTE.horizon) },
        },
        vertexShader:
          'varying vec3 vPosition; void main() { vPosition = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `uniform vec3 top; uniform vec3 middle; uniform vec3 horizon; varying vec3 vPosition;
          void main() {
            float h = clamp(vPosition.y, -0.2, 1.0);
            vec3 color = mix(horizon, middle, smoothstep(-0.02, 0.18, h));
            color = mix(color, top, smoothstep(0.18, 0.6, h));
            gl_FragColor = vec4(color, 1.0);
          }`,
      }),
    [],
  );
  return (
    <mesh material={material} renderOrder={-1}>
      <sphereGeometry args={[220, 32, 16]} />
    </mesh>
  );
}

// Un étal du marché : table, auvent rayé, cagettes et fruits.
const fruitGeometry = new THREE.SphereGeometry(0.11, 12, 10);
function Stall({
  awning,
  rotation = 0,
  ...props
}: { awning: [string, string]; rotation?: number } & GroupProps) {
  const stripes = useMemo(() => stripeTexture(awning[0], awning[1]), [awning]);
  const wood = toon('#8a5a3a');
  const fruits = useMemo(
    () =>
      Array.from({ length: 14 }, (_, index) => ({
        position: [
          -0.9 + (index % 7) * 0.3,
          1.02 + (index > 6 ? 0.1 : 0),
          index > 6 ? 0.1 : -0.2,
        ] as [number, number, number],
        color: ['#f0a63c', '#e5383b', '#e6d36a', '#7cc46a'][index % 4] ?? '#f0a63c',
      })),
    [],
  );
  return (
    <group {...props} rotation={[0, rotation, 0]}>
      <mesh material={wood} position={[0, 0.9, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 0.12, 1.1]} />
      </mesh>
      <mesh material={toon('#6b4329')} position={[0, 0.45, 0.4]}>
        <boxGeometry args={[2.3, 0.85, 0.06]} />
      </mesh>
      {[-1.1, 1.1].map((x) =>
        [-0.45, 0.45].map((z) => (
          <mesh key={`${x}-${z}`} material={wood} position={[x, 1.25, z]}>
            <cylinderGeometry args={[0.04, 0.04, 2.5, 8]} />
          </mesh>
        )),
      )}
      <mesh position={[0, 2.55, 0.05]} rotation={[-0.28, 0, 0]} castShadow>
        <boxGeometry args={[2.7, 0.05, 1.6]} />
        <meshToonMaterial map={stripes} gradientMap={toonGradient()} />
      </mesh>
      {fruits.map((fruit) => (
        <mesh
          key={fruit.position.join()}
          geometry={fruitGeometry}
          material={toon(fruit.color)}
          position={fruit.position}
        />
      ))}
      <Model name="box_A" position={[-0.7, 0, -0.85]} />
      <Model name="box_B" position={[0.6, 0, -0.9]} rotation={[0, 0.4, 0]} />
    </group>
  );
}

// Une guirlande d'ampoules tendue au-dessus de la rue : elles brillent grâce à l'effet de halo.
function FairyLights({ z, sag = 1.3, height = 6.4 }: { z: number; sag?: number; height?: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const count = 26;
  const curve = useMemo(
    () =>
      new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-13.5, height, z),
        new THREE.Vector3(0, height - sag * 2, z + 0.5),
        new THREE.Vector3(13.5, height, z),
      ),
    [z, sag, height],
  );
  const wire = useMemo(() => new THREE.TubeGeometry(curve, 40, 0.015, 4, false), [curve]);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const matrix = new THREE.Matrix4();
    const colors = ['#ffcf8a', '#ff8a8a', '#ffe7b0'];
    for (let index = 0; index < count; index += 1) {
      const point = curve.getPoint((index + 0.5) / count);
      matrix.makeTranslation(point.x, point.y - 0.12, point.z);
      mesh.current.setMatrixAt(index, matrix);
      mesh.current.setColorAt(index, new THREE.Color(colors[index % 3]));
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  }, [curve]);
  useFrame(({ clock }) => {
    const material = mesh.current?.material as THREE.MeshBasicMaterial | undefined;
    if (material) material.color.setScalar(2.2 + Math.sin(clock.elapsedTime * 2 + z) * 0.25);
  });
  return (
    <group>
      <mesh geometry={wire} material={toon('#1b1014')} />
      <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
        <sphereGeometry args={[0.09, 10, 8]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

// Un lampadaire KayKit avec un vrai point de lumière (seulement pour quelques-uns : la lumière
// coûte cher), et une ampoule qui brille pour tous.
function StreetLamp({ light, side, ...props }: { light: boolean; side: 1 | -1 } & GroupProps) {
  return (
    <group {...props}>
      <Model name="streetlight" rotation={[0, side === -1 ? Math.PI : 0, 0]} />
      <mesh position={[side * -1.05, 4.62, 0]}>
        <sphereGeometry args={[0.16, 12, 10]} />
        <meshBasicMaterial color={[3, 2.3, 1.4]} toneMapped={false} />
      </mesh>
      {light && (
        <pointLight
          position={[side * -1.05, 4.4, 0]}
          color={PALETTE.warmLight}
          intensity={22}
          distance={16}
          decay={1.6}
        />
      )}
    </group>
  );
}

const BUILDINGS: ModelName[] = [
  'building_A',
  'building_C',
  'building_E',
  'building_G',
  'building_B',
  'building_D',
  'building_F',
  'building_H',
];

export function City({ eco }: { eco: boolean }) {
  const rows = [10, 0, -10, -20, -30, -40];
  const ground = toon('#24141a');
  return (
    <group>
      <SkyDome />
      {!eco && (
        <Stars radius={160} depth={30} count={1200} factor={5} saturation={0} fade speed={0.4} />
      )}

      <mesh
        material={ground}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.02, -15]}
        receiveShadow
      >
        <planeGeometry args={[200, 200]} />
      </mesh>

      {/* La rue piétonne et ses trottoirs. */}
      {rows.map((z) => (
        <group key={z}>
          <Model name={z === 0 ? 'road_straight_crossing' : 'road_straight'} position={[0, 0, z]} />
          <Model name="base" position={[-TILE, 0, z]} />
          <Model name="base" position={[TILE, 0, z]} />
        </group>
      ))}

      {/* Les façades, des deux côtés, tournées vers la rue. */}
      {rows.map((z, index) => (
        <group key={`b${z}`}>
          <Model
            name={BUILDINGS[index % BUILDINGS.length] ?? 'building_A'}
            position={[-TILE * 2, 0, z]}
            rotation={[0, Math.PI / 2, 0]}
          />
          <Model
            name={BUILDINGS[(index + 3) % BUILDINGS.length] ?? 'building_B'}
            position={[TILE * 2, 0, z]}
            rotation={[0, -Math.PI / 2, 0]}
          />
        </group>
      ))}
      {/* Le fond de la rue, et derrière le joueur : la rue est fermée, on ne se perd pas. */}
      {[-TILE, 0, TILE].map((x, index) => (
        <group key={`end${x}`}>
          <Model
            name={BUILDINGS[(index + 5) % BUILDINGS.length] ?? 'building_H'}
            position={[x, 0, -52]}
          />
          <Model
            name={BUILDINGS[(index + 1) % BUILDINGS.length] ?? 'building_C'}
            position={[x, 0, 22]}
            rotation={[0, Math.PI, 0]}
          />
        </group>
      ))}
      <Model name="watertower" position={[-26, 0, -64]} />

      {/* Lampadaires. */}
      {[8, -6, -20, -34].map((z, index) => (
        <group key={`l${z}`}>
          <StreetLamp side={-1} position={[-6.2, 0, z]} light={!eco && index % 2 === 0} />
          <StreetLamp side={1} position={[6.2, 0, z - 6]} light={!eco && index % 2 === 1} />
        </group>
      ))}

      {/* Le marché. */}
      <Stall awning={['#e5383b', '#f2ebe3']} position={[-11.5, 0, 5]} rotation={Math.PI / 2} />
      <Stall awning={['#f0a63c', '#f2ebe3']} position={[11.5, 0, 5]} rotation={-Math.PI / 2} />
      <Stall awning={['#3d8f7a', '#f2ebe3']} position={[-11.5, 0, -9]} rotation={Math.PI / 2} />
      <Stall awning={['#e5383b', '#2c2f4a']} position={[11.5, 0, -9]} rotation={-Math.PI / 2} />
      <Stall awning={['#5b7fd1', '#f2ebe3']} position={[-11.5, 0, -24]} rotation={Math.PI / 2} />
      <Stall awning={['#e6d36a', '#5a1a2b']} position={[11.5, 0, -24]} rotation={-Math.PI / 2} />
      <Stall awning={['#c75b8a', '#f2ebe3']} position={[-11.5, 0, -31]} rotation={Math.PI / 2} />

      {[4, -10, -24].map((z) => (
        <FairyLights key={z} z={z} />
      ))}

      {/* Le mobilier. */}
      <Model name="car_taxi" position={[-7.5, 0, 15.5]} rotation={[0, 0.3, 0]} />
      <Model name="car_hatchback" position={[7, 0, 16]} rotation={[0, -0.5, 0]} />
      <Model name="car_sedan" position={[-6, 0, -42]} rotation={[0, Math.PI / 2, 0]} />
      <Model name="car_taxi" position={[6.5, 0, -43]} rotation={[0, -Math.PI / 2.4, 0]} />
      <Model name="bench" position={[-13, 0, -2]} rotation={[0, Math.PI / 2, 0]} />
      <Model name="bench" position={[13, 0, -16]} rotation={[0, -Math.PI / 2, 0]} />
      <Model name="dumpster" position={[13.2, 0, 10]} rotation={[0, -Math.PI / 2, 0]} />
      <Model name="firehydrant" position={[-5.8, 0, -13]} />
      <Model name="trash_A" position={[5.8, 0, 1]} />
      {[-14, -4, 12, -28, -38].map((z, index) => (
        <Model key={`bush${z}`} name="bush" position={[index % 2 ? 14 : -14, 0, z]} />
      ))}

      {/* Lucioles et poussière dans la lumière : seulement hors mode éco. */}
      {!eco && (
        <Sparkles
          count={70}
          scale={[26, 6, 50]}
          position={[0, 3, -12]}
          size={3}
          speed={0.25}
          color={PALETTE.warmLight}
          opacity={0.7}
        />
      )}
    </group>
  );
}
