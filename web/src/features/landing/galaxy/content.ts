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

// Les cartes sont des vignettes peintes : une pièce du dossier chacune, à remplacer par de vraies
// images ou vidéos en renseignant `src`.
export const HERO_CLIPS: HeroClip[] = [
  { id: 'v01', label: 'Capture d’écran', tones: ['cool'] },
  { id: 'v02', label: 'Communiqué', tones: ['mono'] },
  { id: 'v03', label: 'Vidéo virale', tones: ['warm'] },
  { id: 'v04', label: 'Message transféré', tones: ['bright', 'warm'] },
  { id: 'v05', label: 'Article', tones: ['mono'] },
  { id: 'v06', label: 'Photo', tones: ['cool', 'bright'] },
  { id: 'v07', label: 'Publication', tones: ['warm'] },
  { id: 'v08', label: 'Audio', tones: ['mono', 'cool'] },
  { id: 'v09', label: 'Témoignage', tones: ['bright'] },
  { id: 'v10', label: 'Archive', tones: ['mono'] },
  { id: 'v11', label: 'Rapport', tones: ['cool'] },
  { id: 'v12', label: 'Source officielle', tones: ['bright', 'warm'] },
];

/** La carte que la torche sort de la galaxie. */
export const REEL_CLIP: HeroClip = { id: 'reel', label: 'Pièce à juger', tones: ['warm'] };

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
