'use client';

import { ArrowRight, Check, CircleHelp, Gavel, RotateCcw, Users, X } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Steps } from '@/components/common/Steps';
import { FormMessage } from '@/components/form/FormField';
import { LoadingState } from '@/components/states/States';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VOTE_LABELS, type Vote } from '@/lib/domain';
import { cn } from '@/lib/utils';
import { type HearingView, openHearing, voteAndJudge } from './actions';
import { ENTER, type HearingPiece, Pleadings, Verdict, Witnesses } from './HearingParts';

const STEPS = ['Lecture', 'Plaidoiries', 'Témoins', 'Vote', 'Conclusion'];
const VOTE_ICONS = { accurate: Check, misleading: X, unsure: CircleHelp } satisfies Record<
  Vote,
  unknown
>;

function initialStep(hearing: HearingView | null) {
  if (!hearing) return 0;
  return hearing.status === 'concluded' ? 4 : 1;
}

// L'audience d'une affaire, en cinq étapes. La personne qui présente avance à son rythme.
export function Hearing({
  caseId,
  claim,
  pieces,
  initialHearing,
}: {
  caseId: string;
  claim: string;
  pieces: HearingPiece[];
  initialHearing: HearingView | null;
}) {
  const [hearing, setHearing] = useState(initialHearing);
  const [step, setStep] = useState(() => initialStep(initialHearing));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function startHearing() {
    setError(null);
    startTransition(async () => {
      const result = await openHearing(caseId);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setHearing(result.data);
      setStep(1);
    });
  }

  function vote(choice: Vote) {
    if (!hearing) return;
    setError(null);
    startTransition(async () => {
      const result = await voteAndJudge(hearing.id, choice);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setHearing(result.data);
      setStep(4);
    });
  }

  return (
    <div className="grid gap-6">
      <Steps steps={STEPS} current={step} />
      <FormMessage message={error} />

      {step === 0 && (
        <Card key="reading" className={ENTER}>
          <CardHeader>
            <CardTitle className="text-xl">L’information jugée</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <blockquote className="border-primary border-l-4 pl-4 text-2xl text-pretty leading-snug">
              « {claim} »
            </blockquote>
            <div className="grid gap-2">
              <p className="text-muted-foreground">
                Le dossier contient {pieces.length} pièce{pieces.length > 1 ? 's' : ''} :
              </p>
              <ol className="grid gap-1">
                {pieces.map((piece) => (
                  <li key={piece.id}>
                    <span className="font-medium text-primary">Pièce n° {piece.number}</span> ·{' '}
                    {piece.title}
                  </li>
                ))}
              </ol>
            </div>
            {pending ? (
              <LoadingState title="Les avocats préparent leurs plaidoiries…" />
            ) : (
              <Button size="lg" onClick={startHearing} className="justify-self-start">
                <Gavel aria-hidden />
                Ouvrir l’audience
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {step === 1 && hearing && (
        <Card key="pleadings">
          <CardHeader>
            <CardTitle className="text-xl">Les plaidoiries</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <Pleadings hearing={hearing} />
            <Button size="lg" onClick={() => setStep(2)} className="justify-self-start">
              <Users aria-hidden />
              Appeler les témoins
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && hearing && (
        <Card key="witnesses">
          <CardHeader>
            <CardTitle className="text-xl">Les pièces passent à la barre</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <Witnesses pieces={pieces} hearing={hearing} />
            <Button size="lg" onClick={() => setStep(3)} className="justify-self-start">
              Passer au vote
              <ArrowRight aria-hidden data-icon="inline-end" />
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 3 && hearing && (
        <Card key="vote" className={ENTER}>
          <CardHeader>
            <CardTitle className="text-2xl">À vous de juger : cette information est…</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            {pending ? (
              <LoadingState title="Le juge délibère…" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                {(Object.keys(VOTE_LABELS) as Vote[]).map((choice) => {
                  const Icon = VOTE_ICONS[choice];
                  return (
                    <Button
                      key={choice}
                      variant="outline"
                      onClick={() => vote(choice)}
                      className="h-auto flex-col gap-2 py-6 text-lg transition-transform duration-150 active:scale-[0.97]"
                    >
                      <Icon aria-hidden className="size-6!" />
                      {VOTE_LABELS[choice]}
                    </Button>
                  );
                })}
              </div>
            )}
            <p className="text-muted-foreground text-sm">
              Votre vote est enregistré avant la conclusion du juge.
            </p>
          </CardContent>
        </Card>
      )}

      {step === 4 && hearing && (
        <Card key="verdict">
          <CardContent className="grid gap-6 pt-2">
            <Verdict hearing={hearing} />
            <Accordion type="single" collapsible>
              <AccordionItem value="pleadings">
                <AccordionTrigger>Revoir les plaidoiries</AccordionTrigger>
                <AccordionContent>
                  <Pleadings hearing={hearing} />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="pieces">
                <AccordionTrigger>Revoir les pièces, avec leur classement</AccordionTrigger>
                <AccordionContent>
                  <Witnesses pieces={pieces} hearing={hearing} revealStance />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            <div className={cn('flex flex-wrap gap-2')}>
              <Button variant="outline" onClick={startHearing} disabled={pending}>
                <RotateCcw aria-hidden />
                {pending ? 'Nouvelle audience…' : 'Rejouer l’audience'}
              </Button>
              <Button asChild variant="ghost">
                <Link href="/court">Toutes les affaires</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
