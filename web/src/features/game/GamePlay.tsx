'use client';

import {
  ArrowRight,
  CircleCheck,
  CircleHelp,
  CircleX,
  Lightbulb,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useRef, useState, useTransition } from 'react';
import { AiSourceBadge } from '@/components/common/DomainBadges';
import { SpeechBubble } from '@/components/common/SpeechBubble';
import { Steps } from '@/components/common/Steps';
import { ToneBadge } from '@/components/common/ToneBadge';
import { FormMessage } from '@/components/form/FormField';
import { Button } from '@/components/ui/button';
import {
  type ClueKind,
  type ClueRating,
  GAME_ANSWER_LABELS,
  GAME_ANSWER_TONES,
  GAME_ANSWERS,
  GAME_GRADE_LABELS,
  GAME_GRADE_TONES,
  type GameAnswer,
} from '@/lib/domain';
import { cn } from '@/lib/utils';
import type { Scenario } from '@/server/db/schema';
import { type Debrief, finishRun, getDebrief, type RunResult } from './actions';
import { ClueCard } from './ClueCard';
import { PostCard } from './PostCard';
import type { RunInput } from './schema';

type Ratings = Partial<Record<ClueKind, ClueRating>>;
type PlayableScenario = Pick<
  Scenario,
  | 'id'
  | 'title'
  | 'content'
  | 'sourceName'
  | 'imagePath'
  | 'clues'
  | 'answer'
  | 'explanation'
  | 'reflex'
>;

const ANSWER_ICONS = { true: CircleCheck, fake: CircleX, cannot_tell: CircleHelp } as const;

// Une série du jeu : pour chaque information, retourner et noter les indices, répondre, lire
// l'explication. À la fin, le serveur recalcule et enregistre le score.
export function GamePlay({ scenarios }: { scenarios: PlayableScenario[] }) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState<ClueKind[]>([]);
  const [ratings, setRatings] = useState<Ratings>({});
  const [answer, setAnswer] = useState<GameAnswer | null>(null);
  const [answers, setAnswers] = useState<RunInput['answers']>([]);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Le conseil de l'IA arrive après la réponse ; il est rattaché à son information pour qu'une
  // réponse tardive ne s'affiche pas sur l'information suivante.
  const [debrief, setDebrief] = useState<{ scenarioId: string; value: Debrief } | null>(null);
  const [debriefPending, startDebrief] = useTransition();
  const topRef = useRef<HTMLDivElement>(null);

  const scenario = scenarios[index];
  const isLast = index === scenarios.length - 1;
  const stepLabels = [...scenarios.map((_, position) => `Information ${position + 1}`), 'Score'];

  function scrollToTop() {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    topRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  function choose(value: GameAnswer) {
    if (!scenario || answer) return;
    setAnswer(value);
    // Après la réponse, tous les indices se retournent : on voit ce qu'il fallait remarquer.
    setRevealed(scenario.clues.map((clue) => clue.kind));
    setAnswers((previous) => [...previous, { scenarioId: scenario.id, answer: value, ratings }]);
    const scenarioId = scenario.id;
    startDebrief(async () => {
      const result = await getDebrief({ scenarioId, answer: value, ratings });
      if (result.ok) setDebrief({ scenarioId, value: result.data });
    });
  }

  function next() {
    if (!isLast) {
      setIndex((current) => current + 1);
      setRevealed([]);
      setRatings({});
      setAnswer(null);
      scrollToTop();
      return;
    }
    setError(null);
    startTransition(async () => {
      const saved = await finishRun({ answers });
      if (saved.ok) {
        setResult(saved.data);
        scrollToTop();
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
    scrollToTop();
  }

  if (result) {
    return (
      <div ref={topRef} className="grid scroll-mt-24 gap-8">
        <Steps steps={stepLabels} current={scenarios.length} />
        <RunSummary result={result} scenarios={scenarios} answers={answers} onRestart={restart} />
      </div>
    );
  }
  if (!scenario) return null;

  const correct = answer !== null && answer === scenario.answer;

  return (
    <div ref={topRef} className="grid scroll-mt-24 gap-8">
      <Steps steps={stepLabels} current={index} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <PostCard
          sourceName={scenario.sourceName}
          content={scenario.content}
          imagePath={scenario.imagePath}
        />

        <section aria-labelledby="clues-title" className="grid content-start gap-4">
          <div className="grid gap-1">
            <h2 id="clues-title" className="font-semibold text-xl">
              Les indices
            </h2>
            <p className="text-muted-foreground">
              Retournez chaque indice : rend-il l’information fiable, ou suspecte ?
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {scenario.clues.map((clue) => (
              <ClueCard
                key={`${scenario.id}-${clue.kind}`}
                clue={clue}
                revealed={revealed.includes(clue.kind)}
                rating={ratings[clue.kind]}
                answered={answer !== null}
                onReveal={() => setRevealed((current) => [...current, clue.kind])}
                onRate={(value) => setRatings((current) => ({ ...current, [clue.kind]: value }))}
              />
            ))}
          </div>
        </section>
      </div>

      {answer === null ? (
        <section aria-labelledby="answer-title" className="grid gap-4">
          <h2 id="answer-title" className="font-semibold text-xl">
            Alors, cette information est…
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {GAME_ANSWERS.map((value) => {
              const Icon = ANSWER_ICONS[value];
              return (
                <Button
                  key={value}
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => choose(value)}
                  className="h-16 text-lg"
                >
                  <Icon aria-hidden className="size-5" />
                  {GAME_ANSWER_LABELS[value]}
                </Button>
              );
            })}
          </div>
        </section>
      ) : (
        <section
          aria-live="polite"
          className={cn(
            'grid gap-4 rounded-xl border p-6',
            correct ? 'bg-success-soft' : 'bg-danger-soft',
          )}
        >
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-semibold text-2xl">
              {correct ? 'Bonne réponse !' : 'Pas tout à fait.'}
            </p>
            <ToneBadge tone={GAME_ANSWER_TONES[scenario.answer]}>
              {scenario.title} : {GAME_ANSWER_LABELS[scenario.answer].toLowerCase()}
            </ToneBadge>
          </div>
          <p className="max-w-prose text-lg">{scenario.explanation}</p>
          <p className="flex items-start gap-2 font-medium text-lg">
            <Lightbulb aria-hidden className="mt-1 size-5 shrink-0" />
            Le réflexe à garder : {scenario.reflex}
          </p>
          <CoachAdvice
            debrief={debrief?.scenarioId === scenario.id ? debrief.value : null}
            pending={debriefPending}
          />
          <FormMessage message={error} />
          <Button
            type="button"
            size="lg"
            onClick={next}
            disabled={pending}
            className="justify-self-start"
          >
            {isLast ? (pending ? 'Calcul du score…' : 'Voir mon score') : 'Information suivante'}
            <ArrowRight aria-hidden data-icon="inline-end" />
          </Button>
        </section>
      )}
    </div>
  );
}

// Le conseil personnalisé du coach (IA, ou réponse préparée hors ligne). Il complète l'explication
// écrite, qui reste affichée : si l'IA ne répond pas du tout, rien ne manque au jeu.
function CoachAdvice({ debrief, pending }: { debrief: Debrief | null; pending: boolean }) {
  if (debrief) {
    return (
      <div className="grid gap-2" aria-live="polite">
        <SpeechBubble speaker="Le coach" caption="conseil personnalisé" tone="info">
          {debrief.advice}
        </SpeechBubble>
        <div>
          <AiSourceBadge source={debrief.source} />
        </div>
      </div>
    );
  }
  if (!pending) return null;
  return (
    <p role="status" className="flex items-center gap-2 text-muted-foreground">
      <Sparkles aria-hidden className="size-4 motion-safe:animate-pulse" />
      Le coach prépare un conseil pour vous…
    </p>
  );
}

// Fin de série : le score, le grade, et les réflexes de la série.
function RunSummary({
  result,
  scenarios,
  answers,
  onRestart,
}: {
  result: RunResult;
  scenarios: PlayableScenario[];
  answers: RunInput['answers'];
  onRestart: () => void;
}) {
  return (
    <section aria-live="polite" className="grid gap-6 rounded-xl border bg-card p-6">
      <div className="flex flex-wrap items-center gap-4">
        <p className="font-semibold text-4xl tabular-nums">
          {result.score} / {result.total}
        </p>
        <ToneBadge tone={GAME_GRADE_TONES[result.grade]} className="px-3 py-1 text-sm">
          {GAME_GRADE_LABELS[result.grade]}
        </ToneBadge>
      </div>

      <div className="grid gap-3">
        <h2 className="font-semibold text-xl">Les réflexes de cette série</h2>
        <ul className="grid gap-3">
          {scenarios.map((scenario) => {
            const given = answers.find((item) => item.scenarioId === scenario.id);
            const right = given?.answer === scenario.answer;
            return (
              <li key={scenario.id} className="flex items-start gap-3">
                {right ? (
                  <CircleCheck
                    aria-label="Bonne réponse"
                    className="mt-0.5 size-5 shrink-0 text-success"
                  />
                ) : (
                  <CircleX
                    aria-label="Mauvaise réponse"
                    className="mt-0.5 size-5 shrink-0 text-danger"
                  />
                )}
                <span>
                  <span className="font-medium">{scenario.title}</span>
                  <span className="text-muted-foreground"> · {scenario.reflex}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="button" size="lg" onClick={onRestart}>
          <RotateCcw aria-hidden />
          Rejouer
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/game">Retour au jeu</Link>
        </Button>
      </div>
    </section>
  );
}
