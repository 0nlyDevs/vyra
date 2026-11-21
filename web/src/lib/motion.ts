// Réglages de mouvement partagés (repris du site Kovity), pour que tout bouge de la même façon.

/** Sortie franche : pour ce qui entre à l'écran. */
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/** Aller-retour : pour ce qui se déplace ou se transforme à l'écran. */
export const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const;

/** Ressort doux pour ce qui suit le pointeur. */
export const SPRING_POINTER = { stiffness: 60, damping: 16, mass: 0.9 } as const;
