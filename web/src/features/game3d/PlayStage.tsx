'use client';

import { Box, Square } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { GamePlay, type PlayableScenario } from '@/features/game/GamePlay';

// La version 3D n'est chargée que dans le navigateur, et seulement si elle est choisie.
const Game3D = dynamic(() => import('./Game3D').then((module) => module.Game3D), {
  ssr: false,
  loading: () => (
    <div className="grid h-[min(80vh,860px)] min-h-[560px] place-items-center rounded-3xl bg-[#12080a] text-sm text-white/70">
      Préparation de la rue du marché…
    </div>
  ),
});

type Mode = '3d' | '2d';
const STORAGE_KEY = 'vyra-game-mode';

function canRun3D() {
  try {
    const canvas = document.createElement('canvas');
    const hasWebGL = Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    return hasWebGL && finePointer && window.innerWidth >= 900;
  } catch {
    return false;
  }
}

function readMode(): Mode | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === '3d' || value === '2d' ? value : null;
  } catch {
    return null;
  }
}

function saveMode(mode: Mode) {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Stockage indisponible (navigation privée) : le choix vaut pour cette visite seulement.
  }
}

// Choisit entre la rue en 3D (souris et clavier) et la version 2D (téléphone, petit écran, sans WebGL).
export function PlayStage({ scenarios }: { scenarios: PlayableScenario[] }) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [mode, setMode] = useState<Mode>('2d');

  useEffect(() => {
    const ok = canRun3D();
    setSupported(ok);
    setMode(ok ? (readMode() ?? '3d') : '2d');
  }, []);

  function choose(next: Mode) {
    setMode(next);
    saveMode(next);
  }

  if (supported === null)
    return <div className="h-[min(80vh,860px)] min-h-[560px] rounded-3xl bg-muted" />;

  return (
    <div className="grid gap-4">
      {supported && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground text-sm">
            {mode === '3d'
              ? 'Promenez-vous dans la rue du marché et tamponnez les rumeurs.'
              : 'Version 2D : les mêmes informations, en cartes.'}
          </p>
          <div className="flex gap-1 rounded-full border bg-card p-1">
            <Button
              size="sm"
              variant={mode === '3d' ? 'default' : 'ghost'}
              className="rounded-full"
              onClick={() => choose('3d')}
              aria-pressed={mode === '3d'}
            >
              <Box aria-hidden data-icon="inline-start" />
              Rue en 3D
            </Button>
            <Button
              size="sm"
              variant={mode === '2d' ? 'default' : 'ghost'}
              className="rounded-full"
              onClick={() => choose('2d')}
              aria-pressed={mode === '2d'}
            >
              <Square aria-hidden data-icon="inline-start" />
              Cartes 2D
            </Button>
          </div>
        </div>
      )}
      {mode === '3d' ? (
        <Game3D scenarios={scenarios} onSwitch2D={() => choose('2d')} />
      ) : (
        <GamePlay scenarios={scenarios} />
      )}
    </div>
  );
}
