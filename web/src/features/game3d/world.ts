import * as THREE from 'three';
import type { ClueKind, GameAnswer } from '@/lib/domain';

// Ce que la scène partage avec la boucle d'animation, sans passer par React (60 fois par seconde).
// Le verrouillage du pointeur (vue à la souris).
export type LockControls = { isLocked: boolean; lock: () => void; unlock: () => void };

// Vue à la première personne (l'outil en main) ou à la troisième (l'avatar à l'écran).
export type View = 'first' | 'third';

// Un tampon d'encre en vol, du bout de l'outil jusqu'au point visé.
export type Shot = {
  from: THREE.Vector3;
  to: THREE.Vector3;
  at: number;
  color: string;
  hit: boolean;
};

export type Target = { kind: 'board' } | { kind: 'clue'; clue: ClueKind };

export type World = {
  // Objets qu'on peut viser : la publication du passant, les stands d'indices.
  targets: Map<THREE.Object3D, Target>;
  // Vitesse du joueur (0 à 1), pour le balancement de l'outil en main.
  speed: { value: number };
  // Obstacles ronds au sol : étals, stands, passant.
  obstacles: { x: number; z: number; r: number }[];
  // Dernier tir, pour le recul de l'outil.
  fired: { at: number };
  // Changement de tampon, pour l'animation de l'outil.
  swapped: { at: number };
  selected: { value: GameAnswer };
  // Position des pieds du joueur (la caméra en dépend selon la vue).
  player: { position: THREE.Vector3 };
  view: { value: View };
  // Ce que vise le centre de l'écran, mis à jour à chaque image.
  aim: { point: THREE.Vector3; hit: boolean };
  // Bout de l'outil, d'où partent les tampons.
  muzzle: THREE.Vector3;
  shots: Shot[];
};

export function createWorld(): World {
  return {
    targets: new Map(),
    speed: { value: 0 },
    obstacles: [
      // Étals (voir City) et stand des autres médias.
      ...[5, -9, -24, -31].map((z) => ({ x: -11.5, z, r: 1.6 })),
      ...[5, -9, -24].map((z) => ({ x: 11.5, z, r: 1.6 })),
    ],
    fired: { at: -10 },
    swapped: { at: -10 },
    selected: { value: 'fake' },
    player: { position: new THREE.Vector3() },
    view: { value: 'third' },
    aim: { point: new THREE.Vector3(), hit: false },
    muzzle: new THREE.Vector3(),
    shots: [],
  };
}
