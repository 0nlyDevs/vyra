/** Les sections de l'accueil, dans l'ordre : ce que la règle de droite graduée parcourt. */
export const SECTIONS = [
  { id: 'accueil', label: 'Vyra' },
  { id: 'parcours', label: 'Le parcours' },
  { id: 'tribunal', label: 'Le tribunal' },
  { id: 'verdict', label: 'Les conclusions' },
  { id: 'difference', label: 'La différence' },
  { id: 'fin', label: 'Commencer' },
] as const;

export type SectionId = (typeof SECTIONS)[number]['id'];
