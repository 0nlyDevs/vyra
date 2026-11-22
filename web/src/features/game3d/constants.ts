import { type ClueKind, GAME_ANSWERS, type GameAnswer } from '@/lib/domain';

// Le décor : une rue de marché d'Ambohitsoa au crépuscule. Les modèles de la ville sont à
// l'échelle d'une maquette (une dalle = 2 unités) : on les agrandit pour une rue à taille humaine.
export const CITY_SCALE = 5;
export const TILE = 2 * CITY_SCALE;

export const EYE_HEIGHT = 1.6;
export const PLAYER_START: [number, number, number] = [0, EYE_HEIGHT, 7];
// Là où chaque passant vient montrer sa publication.
export const RUMOR_SPOT: [number, number, number] = [0, 0, -6];
// La zone où l'on peut marcher : la rue piétonne et ses trottoirs.
export const WALK_BOUNDS = { minX: -12.5, maxX: 12.5, minZ: -34, maxZ: 12 };

// Un stand par indice, toujours au même endroit : on apprend vite où aller.
export const CLUE_SPOTS: Record<ClueKind, [number, number, number]> = {
  source: [-8.5, 0, -2],
  date: [8.5, 0, -2],
  image: [-8.5, 0, -17],
  author: [8.5, 0, -17],
  other_media: [0, 0, -25],
};

// Texte posé sur la couleur d'un tampon : l'encre sombre passe 4,5:1 sur les trois (le blanc non).
export const STAMP_ON = '#0a0a0b';

// Les trois tampons : une couleur et un symbole, jamais la couleur seule.
export const STAMPS: Record<GameAnswer, { color: string; ink: string; mark: string; key: string }> =
  {
    true: { color: '#3fb37f', ink: '#1f8a5b', mark: 'VRAI', key: '1' },
    fake: { color: '#e5383b', ink: '#b3171c', mark: 'FAKE', key: '2' },
    cannot_tell: { color: '#9a8f87', ink: '#5f5550', mark: '?', key: '3' },
  };

export const PALETTE = {
  night: '#12080a',
  horizon: '#ff7b54',
  dusk: '#5a1a2b',
  red: '#e5383b',
  warmLight: '#ffc58a',
  bone: '#f2ebe3',
};

// Une valeur par réponse possible (une texture par tampon, par exemple).
export function perAnswer<T>(build: (answer: GameAnswer) => T): Record<GameAnswer, T> {
  return Object.fromEntries(GAME_ANSWERS.map((answer) => [answer, build(answer)])) as Record<
    GameAnswer,
    T
  >;
}
