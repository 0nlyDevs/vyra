'use client';

import { HeroGalaxie } from './galaxy/HeroGalaxie';

/** Le haut de l'accueil : la galaxie de pièces et le champ « Une info douteuse ? ». */
export function Hero({ signedIn }: { signedIn: boolean }) {
  return <HeroGalaxie ready signedIn={signedIn} />;
}
