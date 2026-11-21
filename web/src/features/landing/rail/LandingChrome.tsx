'use client';

import { useEffect } from 'react';
import { useReducedMotion } from '../galaxy/motion';
import { Preloader } from './Preloader';
import { Rail } from './Rail';
import { setLandingReady, useLandingReady } from './ready';
import { Wordmark } from './Wordmark';

/** Ce qui entoure l'accueil : le préchargeur d'ouverture, le mot fixe en haut à gauche et la règle de navigation de droite. */
export function LandingChrome() {
  const ready = useLandingReady();
  const reduce = useReducedMotion();

  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('on-landing');
    return () => {
      html.classList.remove('on-landing');
      setLandingReady(false);
    };
  }, []);

  return (
    <>
      <Preloader onDone={() => setLandingReady(true)} />
      <Wordmark />
      {!reduce && <Rail ready={ready} heroWord />}
    </>
  );
}
