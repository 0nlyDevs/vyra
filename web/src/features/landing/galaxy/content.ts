/** Ton d'une carte de la galaxie : les cartes s'éclairent selon le ton de la phrase tapée. */
export type ClipTone = 'cool' | 'warm' | 'mono' | 'bright';

export interface HeroClip {
  id: string;
  /** Texte peint sur la carte. */
  label: string;
  tones: ClipTone[];
  /** Vidéo facultative (h264, muette). Sans elle, une carte peinte est dessinée. */
  src?: string;
}

// Les cartes de la galaxie : de courts extraits vidéo (voir public/landing/videos/CREDITS.md). Sans
// `src`, une vignette peinte est dessinée à la place.
export const HERO_CLIPS: HeroClip[] = [
  { id: 'v01', label: 'Marché', tones: ['warm'], src: '/landing/videos/marche-a.mp4' },
  {
    id: 'v02',
    label: 'Cyclone Freddy',
    tones: ['cool'],
    src: '/landing/videos/cyclone-freddy.mp4',
  },
  {
    id: 'v03',
    label: 'Délestage vu du ciel',
    tones: ['mono'],
    src: '/landing/videos/delestage-satellite.mp4',
  },
  { id: 'v04', label: 'Archive', tones: ['mono'], src: '/landing/videos/archive-a.mp4' },
  { id: 'v05', label: 'Reportage TV', tones: ['bright', 'cool'], src: '/auth/tv-reportage.mp4' },
  {
    id: 'v06',
    label: 'Cyclone Gamane',
    tones: ['warm', 'bright'],
    src: '/landing/videos/cyclone-gamane.mp4',
  },
  { id: 'v07', label: 'Route', tones: ['bright'], src: '/landing/videos/route.mp4' },
  {
    id: 'v08',
    label: 'Coupure vue du ciel',
    tones: ['mono', 'cool'],
    src: '/landing/videos/coupure-satellite.mp4',
  },
  {
    id: 'v09',
    label: 'Carte',
    tones: ['bright', 'warm'],
    src: '/landing/videos/carte-madagascar.mp4',
  },
  { id: 'v10', label: 'Marché', tones: ['warm'], src: '/landing/videos/marche-b.mp4' },
  { id: 'v11', label: 'Archive', tones: ['mono'], src: '/landing/videos/archive-b.mp4' },
  { id: 'v12', label: 'Studio radio', tones: ['warm', 'cool'], src: '/auth/studio-radio.mp4' },
];

/** La carte que la torche sort de la galaxie. */
export const REEL_CLIP: HeroClip = {
  id: 'reel',
  label: 'Pièce à juger',
  tones: ['warm'],
  src: '/landing/videos/reel-rocade-nuit.mp4',
};

export const GALAXIE = {
  word: 'VYRA',
  tag: 'Vérifier avant de croire',
  /** Les phrases qui se tapent dans le champ, l'une après l'autre ; en envoyer une agite la galaxie. */
  prompts: [
    '« Le sel iodé protège de la radiation » : c’est vrai ?',
    'Cette vidéo date vraiment de cette semaine ?',
    'Qui a publié ce communiqué en premier ?',
    'Ce message transféré est-il authentique ?',
  ],
  bar: {
    label: 'Collez une info douteuse : Vyra la fait juger',
    submit: 'Faire juger',
  },
  title: 'Une info douteuse\u00a0?',
  titleEm: 'Faites-la juger.',
  lead: 'Voyez d’où elle vient, écoutez les deux camps, puis concluez seulement quand les preuves le permettent.',
};
