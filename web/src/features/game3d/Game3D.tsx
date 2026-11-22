'use client';

import { useProgress } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import * as THREE from 'three';
import { type Debrief, finishRun, getDebrief, type RunResult } from '@/features/game/actions';
import { type PlayableScenario, RunSummary } from '@/features/game/GamePlay';
import type { RunInput } from '@/features/game/schema';
import { type ClueKind, type ClueRating, GAME_ANSWERS, type GameAnswer } from '@/lib/domain';
import { cn } from '@/lib/utils';
import { gameAudio } from './audio';
import { Chibi, MASCOTS } from './Chibi';
import { City } from './City';
import { PALETTE, RUMOR_SPOT, STAMPS } from './constants';
import { CluePanel, Hud, KEY, ResultPanel } from './Hud';
import { type CameraMode, Player } from './Player';
import { Confetti, Rumor, SpreadWave } from './Rumor';
import { flightTime, PlayerAvatar, Shots } from './Shots';
import { StampTool } from './StampTool';
import { ClueStation, Crowd } from './Stations';
import { createWorld, type LockControls, type Target, type View, type World } from './world';

type Phase = 'menu' | 'intro' | 'play' | 'summary';
type Avatar = 'girl' | 'boy';
type Ratings = Partial<Record<ClueKind, ClueRating>>;

const AVATARS: Record<Avatar, { name: string; role: string; description: string }> = {
  girl: {
    name: 'Hasina',
    role: 'La vérificatrice',
    description: 'Couettes, écharpe rouge, l’œil sur les dates.',
  },
  boy: {
    name: 'Toky',
    role: 'Le vérificateur',
    description: 'Lunettes, écharpe rouge, toujours la source d’abord.',
  },
};
const MAX_AIM = { board: 32, clue: 7 };
// En troisième personne, la caméra est 3,6 m derrière l'avatar : la portée compte depuis lui.
const THIRD_PERSON_REACH = 3.6;
const VIEW_KEY = 'vyra-game-view';

function readView(): View {
  try {
    return window.localStorage.getItem(VIEW_KEY) === 'first' ? 'first' : 'third';
  } catch {
    return 'third';
  }
}

// Vise ce qui est au centre de l'écran, à chaque image, et prévient React seulement au changement.
function Aim({
  world,
  enabled,
  onTarget,
}: {
  world: World;
  enabled: boolean;
  onTarget: (target: Target | null) => void;
}) {
  const camera = useThree((state) => state.camera);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const center = useMemo(() => new THREE.Vector2(0, 0), []);
  const last = useRef<Target | null>(null);
  useFrame(() => {
    let found: Target | null = null;
    if (enabled) {
      raycaster.setFromCamera(center, camera);
      const reach = world.view.value === 'third' ? THIRD_PERSON_REACH : 0;
      const hits = raycaster.intersectObjects([...world.targets.keys()], false);
      for (const hit of hits) {
        const target = world.targets.get(hit.object);
        if (target && hit.distance <= MAX_AIM[target.kind] + reach) {
          found = target;
          world.aim.point.copy(hit.point);
          world.aim.hit = true;
          break;
        }
      }
      if (!found) {
        // Rien de visé : le tir file droit devant, jusqu'au sol ou à 30 m.
        const ray = raycaster.ray;
        const ground = ray.direction.y < -0.01 ? -ray.origin.y / ray.direction.y : Infinity;
        ray.at(Math.min(30, ground), world.aim.point);
        world.aim.hit = false;
      }
    }
    const same =
      found?.kind === last.current?.kind &&
      (found?.kind !== 'clue' || last.current?.kind !== 'clue' || found.clue === last.current.clue);
    if (!same) {
      last.current = found;
      onTarget(found);
      if (found) gameAudio.hover();
    }
  });
  return null;
}

// Les commandes, rappelées en pause : la touche, puis ce qu'elle fait.
const CONTROLS = [
  ['Z Q S D', 'marcher'],
  ['Maj', 'courir'],
  ['Clic', 'tamponner'],
  ['E', 'examiner un indice'],
  ['1 2 3', 'choisir l’encre'],
  ['Molette', 'encre suivante'],
  ['V', 'changer de vue'],
  ['F', 'plein écran'],
] as const;

function Loader() {
  const { progress, active } = useProgress();
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (!active && progress >= 100) {
      const timer = window.setTimeout(() => setHidden(true), 450);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [active, progress]);
  if (hidden) return null;
  return (
    <div
      className={cn(
        'absolute inset-0 z-40 grid place-items-center bg-[#12080a] transition-opacity duration-500',
        !active && progress >= 100 && 'opacity-0',
      )}
    >
      <div className="grid w-64 gap-3 text-center text-white">
        <p className="eyebrow">Chargement de la rue</p>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${Math.round(progress)}%` }}
          />
        </div>
        <p className="text-sm text-white/80 tabular-nums">{Math.round(progress)} %</p>
      </div>
    </div>
  );
}

export function Game3D({
  scenarios,
  onSwitch2D,
}: {
  scenarios: PlayableScenario[];
  onSwitch2D: () => void;
}) {
  const world = useMemo(() => createWorld(), []);
  const container = useRef<HTMLDivElement>(null);
  const controls = useRef<LockControls | null>(null);
  const [phase, setPhase] = useState<Phase>('menu');
  const [avatar, setAvatar] = useState<Avatar>('girl');
  const [hovered, setHovered] = useState<Avatar | null>(null);
  const [chosen, setChosen] = useState<Avatar | null>(null);
  const [locked, setLocked] = useState(false);
  const [target, setTarget] = useState<Target | null>(null);
  const [selected, setSelected] = useState<GameAnswer>('fake');
  const [muted, setMuted] = useState(false);
  const [view, setView] = useState<View>('third');
  const [fullscreen, setFullscreen] = useState(false);
  const [eco, setEco] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toggleMute = useCallback(() => {
    setMuted((current) => {
      gameAudio.setMuted(!current);
      return !current;
    });
  }, []);

  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState<ClueKind[]>([]);
  const [ratings, setRatings] = useState<Ratings>({});
  const [answer, setAnswer] = useState<GameAnswer | null>(null);
  const [answers, setAnswers] = useState<RunInput['answers']>([]);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [debrief, setDebrief] = useState<{ scenarioId: string; value: Debrief } | null>(null);
  const [debriefPending, startDebrief] = useTransition();
  const [openClue, setOpenClue] = useState<ClueKind | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [arrived, setArrived] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [confetti, setConfetti] = useState(0);
  const [wave, setWave] = useState(0);

  const scenario = scenarios[index];
  const isLast = index === scenarios.length - 1;
  const correct = answer !== null && scenario ? answer === scenario.answer : null;
  const panelOpen = openClue !== null || showResult;

  useEffect(() => {
    const saved = readView();
    world.view.value = saved;
    setView(saved);
  }, [world]);

  const changeView = useCallback(
    (next: View) => {
      world.view.value = next;
      setView(next);
      gameAudio.swap();
      try {
        window.localStorage.setItem(VIEW_KEY, next);
      } catch {
        // Stockage indisponible : le choix vaut pour cette partie.
      }
    },
    [world],
  );

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void container.current?.requestFullscreen();
  }, []);

  // Un tampon d'encre part du bout de l'outil vers le point visé.
  const shoot = useCallback(() => {
    const now = performance.now() / 1000;
    world.fired.at = now;
    const shot = {
      from: world.muzzle.clone(),
      to: world.aim.point.clone(),
      at: now,
      color: STAMPS[world.selected.value].color,
      hit: world.aim.hit,
    };
    world.shots.push(shot);
    return flightTime(shot);
  }, [world]);

  useEffect(() => {
    setEco(document.documentElement.dataset.eco === 'on');
    const onFullscreen = () => setFullscreen(document.fullscreenElement === container.current);
    document.addEventListener('fullscreenchange', onFullscreen);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreen);
      gameAudio.stopAmbience();
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const unlock = useCallback(() => controls.current?.unlock(), []);
  const lock = useCallback(() => {
    const attempt = () => {
      try {
        controls.current?.lock();
      } catch {
        // Refus du navigateur : le calque de pause reste affiché, un clic suffira.
      }
    };
    attempt();
    // Juste après Échap, Chrome refuse le verrouillage pendant environ une seconde : on réessaie.
    window.setTimeout(() => {
      if (!controls.current?.isLocked) attempt();
    }, 1200);
  }, []);

  const select = useCallback(
    (value: GameAnswer) => {
      world.selected.value = value;
      world.swapped.at = performance.now() / 1000;
      setSelected(value);
      gameAudio.swap();
    },
    [world],
  );

  const examine = useCallback(
    (kind: ClueKind) => {
      setOpenClue(kind);
      setRevealed((current) => (current.includes(kind) ? current : [...current, kind]));
      gameAudio.reveal();
      unlock();
    },
    [unlock],
  );

  const stampPost = useCallback(() => {
    if (!scenario || answer) return;
    const value = world.selected.value;
    const flight = shoot();
    gameAudio.stamp();
    const right = value === scenario.answer;
    window.setTimeout(() => {
      setAnswer(value);
      setRevealed(scenario.clues.map((clue) => clue.kind));
      setAnswers((previous) => [...previous, { scenarioId: scenario.id, answer: value, ratings }]);
      if (right) {
        setConfetti((count) => count + 1);
        gameAudio.success();
      } else {
        setWave((count) => count + 1);
        gameAudio.fail();
      }
    }, flight * 1000);
    const scenarioId = scenario.id;
    startDebrief(async () => {
      const advice = await getDebrief({ scenarioId, answer: value, ratings });
      if (advice.ok) setDebrief({ scenarioId, value: advice.data });
    });
    // On laisse voir la réaction de la rue avant d'ouvrir l'explication.
    window.setTimeout(() => {
      setShowResult(true);
      unlock();
    }, 1500);
  }, [scenario, answer, ratings, shoot, unlock, world]);

  // Le tir : examiner un stand visé, sinon tamponner la publication.
  const fire = useCallback(() => {
    if (phase !== 'play' || panelOpen) return;
    if (target?.kind === 'clue') {
      examine(target.clue);
      return;
    }
    if (target?.kind === 'board' && arrived && !answer) {
      stampPost();
      return;
    }
    shoot();
    gameAudio.miss();
    if (!answer)
      setToast(
        arrived
          ? 'Visez la publication du passant pour la tamponner.'
          : 'Attendez que le passant arrive.',
      );
  }, [phase, panelOpen, target, arrived, answer, examine, stampPost, shoot]);

  // Clavier et souris pendant le jeu.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (phase !== 'play') return;
      // Lettres : par la touche tapée ou par sa place (AZERTY comme QWERTY).
      const pressed = (letter: string) =>
        event.key.toLowerCase() === letter || event.code === `Key${letter.toUpperCase()}`;
      if (event.repeat) return;
      if (pressed('f')) toggleFullscreen();
      if (pressed('m')) toggleMute();
      if (pressed('v') && !panelOpen) changeView(world.view.value === 'third' ? 'first' : 'third');
      if (openClue && (pressed('e') || event.code === 'Escape')) {
        setOpenClue(null);
        lock();
        return;
      }
      if (panelOpen) return;
      const number = ['Digit1', 'Digit2', 'Digit3', 'Numpad1', 'Numpad2', 'Numpad3'].indexOf(
        event.code,
      );
      if (number >= 0) select(GAME_ANSWERS[number % 3] ?? 'fake');
      if (pressed('e') && target?.kind === 'clue') examine(target.clue);
    };
    const onMouse = (event: MouseEvent) => {
      if (event.button === 0 && controls.current?.isLocked) fire();
    };
    const onWheel = (event: WheelEvent) => {
      if (!controls.current?.isLocked) return;
      const current = GAME_ANSWERS.indexOf(world.selected.value);
      const next = (current + (event.deltaY > 0 ? 1 : 2)) % 3;
      select(GAME_ANSWERS[next] ?? 'fake');
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onMouse);
    window.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onMouse);
      window.removeEventListener('wheel', onWheel);
    };
  }, [
    phase,
    panelOpen,
    openClue,
    target,
    fire,
    select,
    examine,
    lock,
    world,
    toggleFullscreen,
    toggleMute,
    changeView,
  ]);

  function chooseAvatar(value: Avatar) {
    gameAudio.unlock();
    gameAudio.click();
    setAvatar(value);
    setChosen(value);
    window.setTimeout(() => {
      setPhase('intro');
      gameAudio.startAmbience();
    }, 900);
  }

  function next() {
    gameAudio.click();
    if (!isLast) {
      setShowResult(false);
      setLeaving(true);
      lock();
      window.setTimeout(() => {
        setIndex((current) => current + 1);
        setRevealed([]);
        setRatings({});
        setAnswer(null);
        setArrived(false);
        setLeaving(false);
      }, 1100);
      return;
    }
    setError(null);
    startTransition(async () => {
      const saved = await finishRun({ answers });
      if (saved.ok) {
        setResult(saved.data);
        setShowResult(false);
        setPhase('summary');
        gameAudio.fanfare();
      } else {
        setError(saved.error.message);
      }
    });
  }

  function restart() {
    setIndex(0);
    setRevealed([]);
    setRatings({});
    setAnswer(null);
    setAnswers([]);
    setResult(null);
    setArrived(false);
    setPhase('intro');
  }

  const look = MASCOTS[avatar];
  const cameraMode: CameraMode = phase;
  const clue = openClue && scenario ? scenario.clues.find((item) => item.kind === openClue) : null;

  return (
    <div
      ref={container}
      className={cn(
        'dark relative isolate overflow-hidden rounded-3xl border border-white/10 bg-[#12080a] text-foreground shadow-2xl [--eyebrow-color:rgb(255_255_255/0.82)]',
        fullscreen ? 'h-screen rounded-none' : 'h-[min(80vh,860px)] min-h-[560px]',
      )}
    >
      <Canvas
        shadows={!eco}
        dpr={eco ? 1 : [1, 1.75]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ fov: 70, near: 0.05, far: 400, position: [0, 2.3, 7.2] }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <color attach="background" args={[PALETTE.night]} />
        <fog attach="fog" args={['#3a1420', 20, 90]} />
        <hemisphereLight args={['#ff9e7a', '#2a0f16', 0.75]} />
        <ambientLight intensity={0.18} />
        <directionalLight
          position={[-30, 26, -40]}
          intensity={1.6}
          color="#ffb38a"
          castShadow={!eco}
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-40}
          shadow-camera-right={40}
          shadow-camera-top={40}
          shadow-camera-bottom={-40}
          shadow-bias={-0.0004}
        />
        <directionalLight position={[20, 14, 30]} intensity={0.35} color="#8fa8ff" />

        <Suspense fallback={null}>
          <City eco={eco} />
        </Suspense>

        {/* Le menu : les deux mascottes attendent qu'on les choisisse. */}
        {phase === 'menu' && (
          <group>
            <Chibi
              look={MASCOTS.girl}
              mood={chosen === 'girl' ? 'happy' : hovered === 'girl' ? 'wave' : 'idle'}
              position={[-0.95, 0, 1.4]}
              rotation={[0, 0.25, 0]}
              scale={1.15}
              seed={1}
            />
            <Chibi
              look={MASCOTS.boy}
              mood={chosen === 'boy' ? 'happy' : hovered === 'boy' ? 'wave' : 'idle'}
              position={[0.95, 0, 1.4]}
              rotation={[0, -0.25, 0]}
              scale={1.15}
              seed={2}
            />
            {/* Lumière de face : les visages ne sont pas à contre-jour. */}
            <pointLight position={[0, 2.2, 4.2]} intensity={9} distance={9} color="#ffe2c8" />
            <spotLight
              position={[0, 6, 5]}
              angle={0.5}
              penumbra={0.8}
              intensity={60}
              color="#ffd6b0"
              castShadow={!eco}
              target-position={[0, 0, 1.4]}
            />
          </group>
        )}

        {/* La fin : la mascotte fête le score au milieu de la rue. */}
        {phase === 'summary' && (
          <group position={[RUMOR_SPOT[0], 0, RUMOR_SPOT[2] + 2]}>
            <Chibi look={look} mood="happy" scale={1.3} seed={5} />
            <pointLight position={[0, 3, 2]} intensity={18} distance={10} color="#ffd6b0" />
          </group>
        )}

        {(phase === 'play' || phase === 'intro') && scenario && (
          <>
            <Rumor
              world={world}
              round={index}
              post={scenario}
              answer={answer}
              correct={correct}
              leaving={leaving}
              onArrived={() => {
                setArrived(true);
                if (index === 0)
                  setToast('Examinez les stands d’indices, puis tamponnez la publication.');
              }}
            />
            {scenario.clues.map((item) => (
              <ClueStation
                key={item.kind}
                kind={item.kind}
                world={world}
                revealed={revealed.includes(item.kind)}
                rating={ratings[item.kind]}
                targeted={target?.kind === 'clue' && target.clue === item.kind}
              />
            ))}
          </>
        )}
        <Crowd
          world={world}
          alarmed={answer !== null && correct === false}
          cheering={answer !== null && correct === true}
        />
        <Confetti trigger={confetti} origin={[RUMOR_SPOT[0], 2.9, RUMOR_SPOT[2] + 0.6]} />
        <SpreadWave trigger={wave} origin={RUMOR_SPOT} />

        <Player
          world={world}
          view={view}
          mode={cameraMode}
          active={!panelOpen}
          controlsRef={controls}
          onLockChange={(value) => {
            setLocked(value);
            if (value) gameAudio.unlock();
          }}
          onIntroDone={() => setPhase('play')}
        />
        {phase === 'play' && <StampTool world={world} visible={!panelOpen && view === 'first'} />}
        <PlayerAvatar world={world} look={look} visible={phase === 'play' || phase === 'intro'} />
        <Shots world={world} />
        <Aim
          world={world}
          enabled={phase === 'play' && locked && !panelOpen}
          onTarget={setTarget}
        />

        {!eco && (
          <EffectComposer multisampling={4}>
            <Bloom mipmapBlur intensity={0.85} luminanceThreshold={0.75} luminanceSmoothing={0.2} />
            <Vignette darkness={0.55} offset={0.25} />
          </EffectComposer>
        )}
      </Canvas>

      <Loader />

      {/* Menu : choisir son avatar. */}
      {phase === 'menu' && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-6 sm:p-8">
          {/* Voiles : le texte ne se pose jamais sur les guirlandes ni sur le ciel clair. */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 -z-10 h-72 bg-linear-to-b from-black/80 via-black/45 to-transparent"
          />
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 -z-10 h-80 bg-linear-to-t from-black/75 via-black/35 to-transparent"
          />
          <div className="grid max-w-lg gap-3 text-white animate-in fade-in-0 slide-in-from-top-4 duration-700">
            <p className="eyebrow">Vrai ou fake · en 3D</p>
            <h2 className="display text-4xl sm:text-5xl">La rue du marché</h2>
            <p className="max-w-md text-pretty text-white/90 [text-shadow:0_1px_12px_rgb(0_0_0/0.6)]">
              Les rumeurs circulent entre les étals. Examinez les indices, puis tamponnez chaque
              publication : vrai, fake, ou impossible à dire.
            </p>
          </div>
          <div className="pointer-events-auto grid gap-3 sm:self-end lg:w-[46rem]">
            <div className="flex items-center justify-end gap-2.5 text-sm text-white">
              <span id="game3d-view-label" className="font-medium">
                Vue
              </span>
              <fieldset
                aria-labelledby="game3d-view-label"
                className="flex min-w-0 gap-1 rounded-full border border-white/15 bg-black/60 p-1 backdrop-blur-xl"
              >
                {(
                  [
                    ['third', '3e personne'],
                    ['first', '1re personne'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={view === value}
                    onClick={() => changeView(value)}
                    className={cn(
                      'min-h-10 rounded-full px-4 font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
                      view === value
                        ? 'bg-primary text-primary-foreground'
                        : 'text-white/85 hover:bg-white/12 hover:text-white',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </fieldset>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {(['girl', 'boy'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  disabled={chosen !== null}
                  onMouseEnter={() => {
                    setHovered(value);
                    gameAudio.unlock();
                    gameAudio.hover();
                  }}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(value)}
                  onClick={() => chooseAvatar(value)}
                  className={cn(
                    'group grid gap-1 rounded-3xl border border-white/15 bg-black/60 p-5 text-left text-white backdrop-blur-xl transition-[transform,border-color,background-color,opacity] duration-300 ease-out enabled:hover:-translate-y-1 enabled:hover:border-white/50 enabled:hover:bg-black/70 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-white/80 disabled:cursor-default',
                    chosen === value && 'border-white bg-black/75',
                    chosen && chosen !== value && 'opacity-45',
                  )}
                >
                  <span className="eyebrow text-[0.68rem]!">{AVATARS[value].role}</span>
                  <span className="font-semibold text-2xl">{AVATARS[value].name}</span>
                  <span className="text-sm text-white/85">{AVATARS[value].description}</span>
                  <span className="mt-3 inline-flex items-center gap-1.5 justify-self-start rounded-full bg-primary px-3.5 py-1.5 font-semibold text-primary-foreground text-sm">
                    {chosen === value ? 'C’est parti !' : `Jouer avec ${AVATARS[value].name}`}
                    <ArrowRight
                      aria-hidden
                      className="size-4 transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {phase === 'play' && scenario && (
        <Hud
          round={index}
          total={scenarios.length}
          clues={scenario.clues}
          revealed={revealed}
          ratings={ratings}
          target={target}
          selected={selected}
          answered={answer !== null}
          muted={muted}
          fullscreen={fullscreen}
          view={view}
          onView={() => changeView(view === 'third' ? 'first' : 'third')}
          onSelect={select}
          onCycle={() => {
            const current = GAME_ANSWERS.indexOf(world.selected.value);
            select(GAME_ANSWERS[(current + 1) % GAME_ANSWERS.length] ?? 'fake');
          }}
          onMute={toggleMute}
          onFullscreen={toggleFullscreen}
          onSwitch2D={onSwitch2D}
        />
      )}

      {toast && phase === 'play' && !panelOpen && (
        <p className="pointer-events-none absolute top-24 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/60 px-4 py-2 text-sm text-white backdrop-blur-md animate-in fade-in-0 slide-in-from-top-2 duration-300">
          {toast}
        </p>
      )}

      {/* Pause, ou entrée dans la rue : un clic verrouille la souris (calque visé par les contrôles). */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: la souris est requise pour viser, le clavier a déjà ses touches. */}
      <div
        id="game3d-lock-layer"
        onClick={lock}
        className={cn(
          'absolute inset-0 z-30 grid place-items-center bg-black/50 backdrop-blur-[2px] transition-opacity duration-300',
          phase === 'play' && !locked && !panelOpen
            ? 'cursor-pointer opacity-100'
            : 'pointer-events-none opacity-0',
        )}
      >
        <div className="grid max-w-sm gap-4 rounded-3xl border border-white/15 bg-black/75 p-6 text-center text-white backdrop-blur-xl">
          <p className="eyebrow">{answers.length === 0 && !answer ? 'Prêt ?' : 'Pause'}</p>
          <p className="display text-3xl">
            {answers.length === 0 && !answer ? 'Entrer dans la rue' : 'Reprendre'}
          </p>
          <p className="text-sm text-white/85">
            Cliquez pour viser à la souris. Échap pour revenir ici.
          </p>
          <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 text-left text-sm text-white/90">
            {CONTROLS.map(([keys, action]) => (
              <div key={keys} className="contents">
                <dt className="justify-self-end">
                  <kbd className={KEY}>{keys}</kbd>
                </dt>
                <dd>{action}</dd>
              </div>
            ))}
          </dl>
          <span className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground">
            <Sparkles aria-hidden className="size-4" />
            Cliquer pour jouer
          </span>
        </div>
      </div>

      {clue && (
        <CluePanel
          clue={clue}
          rating={ratings[clue.kind]}
          answered={answer !== null}
          onRate={(value) => {
            gameAudio.rate();
            setRatings((current) => ({ ...current, [clue.kind]: value }));
          }}
          onClose={() => {
            gameAudio.click();
            setOpenClue(null);
            lock();
          }}
        />
      )}

      {showResult && scenario && answer && (
        <ResultPanel
          correct={correct === true}
          title={scenario.title}
          answer={scenario.answer}
          explanation={scenario.explanation}
          reflex={scenario.reflex}
          debrief={debrief?.scenarioId === scenario.id ? debrief.value : null}
          debriefPending={debriefPending}
          isLast={isLast}
          pending={pending}
          error={error}
          onNext={next}
        />
      )}

      {phase === 'summary' && result && (
        <div className="absolute inset-y-3 left-3 z-20 w-[min(34rem,calc(100%-1.5rem))] overflow-y-auto rounded-3xl animate-in fade-in-0 slide-in-from-left-10 duration-700">
          <div className="dark grid gap-2 rounded-t-3xl border border-white/10 border-b-0 bg-background/88 px-6 pt-6 text-foreground backdrop-blur-xl">
            <p className="eyebrow">Fin de la série</p>
            <p className="display text-3xl">Bravo {AVATARS[avatar].name} !</p>
          </div>
          <div className="dark [&>section]:rounded-t-none [&>section]:border-white/10 [&>section]:bg-background/88 [&>section]:backdrop-blur-xl">
            <RunSummary
              result={result}
              scenarios={scenarios}
              answers={answers}
              onRestart={restart}
            />
          </div>
        </div>
      )}

      {phase === 'intro' && (
        <p className="pointer-events-none absolute bottom-8 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/50 px-4 py-2 text-white text-sm backdrop-blur-md animate-in fade-in-0 duration-700">
          Entrée dans la rue du marché…
        </p>
      )}

      <span className="sr-only" aria-live="polite">
        {answer ? `Tampon ${STAMPS[answer].mark}` : ''}
      </span>
    </div>
  );
}
