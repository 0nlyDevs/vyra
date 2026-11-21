import { CircleCheck, CircleDashed, CircleX, Lightbulb, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { AiNotice } from '@/components/common/AiNotice';
import {
  AiSourceBadge,
  CertaintyBadge,
  EvidenceStanceBadge,
} from '@/components/common/DomainBadges';
import { SpeakButton } from '@/components/common/SpeakButton';
import { SpeechBubble } from '@/components/common/SpeechBubble';
import { ToneBadge } from '@/components/common/ToneBadge';
import {
  CERTAINTY_CRITERIA,
  EVIDENCE_STRENGTH_LABELS,
  type EvidenceStance,
  type EvidenceStrength,
  VOTE_LABELS,
  VOTE_MATCHING_CERTAINTY,
} from '@/lib/domain';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { HearingView } from './actions';

// Morceaux d'affichage de l'audience. L'état et l'enchaînement des étapes sont dans Hearing.tsx.

export type HearingPiece = {
  id: string;
  number: number;
  title: string;
  content: string;
  sourceName: string;
  publishedAt: Date | null;
  stance: EvidenceStance;
  strength: EvidenceStrength;
};

// Entrée d'un bloc : léger glissement vers le haut, courbe de sortie nette, rien si mouvement réduit.
export const ENTER =
  'animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:slide-in-from-bottom-0';

function PieceChips({ numbers }: { numbers: number[] }) {
  if (numbers.length === 0) {
    return <p className="text-muted-foreground text-sm">Aucune pièce citée.</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {numbers.map((number) => (
        <ToneBadge key={number}>Pièce n° {number}</ToneBadge>
      ))}
    </div>
  );
}

// Garde-fou : une citation que l'avocat attribue aux pièces sans qu'elle y soit écrite.
function UnverifiedQuotes({ quotes }: { quotes?: string[] }) {
  if (!quotes?.length) return null;
  return (
    <div className="grid max-w-prose gap-1 rounded-lg bg-warning-soft p-3 text-sm">
      <p className="flex items-center gap-2 font-semibold text-warning">
        <TriangleAlert aria-hidden className="size-4" />
        Citation introuvable dans les pièces
      </p>
      <ul className="grid gap-0.5">
        {quotes.map((quote) => (
          <li key={quote}>« {quote} »</li>
        ))}
      </ul>
      <p className="text-muted-foreground">Ne la tenez pas pour une preuve.</p>
    </div>
  );
}

export function Pleadings({ hearing }: { hearing: HearingView }) {
  return (
    <div className="grid gap-6">
      <div className={cn('grid gap-2', ENTER)}>
        <SpeechBubble
          speaker="Accusation"
          caption="soutient que l’information est trompeuse"
          tone="warning"
        >
          {hearing.prosecution.argument}
        </SpeechBubble>
        <div className="flex flex-wrap items-center gap-2">
          <PieceChips numbers={hearing.prosecution.cited} />
          <SpeakButton text={hearing.prosecution.argument} />
        </div>
        <UnverifiedQuotes quotes={hearing.prosecution.unverified} />
      </div>
      <div className={cn('grid justify-items-end gap-2 [animation-delay:120ms]', ENTER)}>
        <SpeechBubble
          speaker="Défense"
          caption="soutient que l’information est exacte"
          tone="info"
          side="end"
        >
          {hearing.defense.argument}
        </SpeechBubble>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <SpeakButton text={hearing.defense.argument} />
          <PieceChips numbers={hearing.defense.cited} />
        </div>
        <UnverifiedQuotes quotes={hearing.defense.unverified} />
      </div>
      <AiSourceBadge source={hearing.pleadingsSource} />
    </div>
  );
}

export function Witnesses({
  pieces,
  hearing,
  revealStance = false,
}: {
  pieces: HearingPiece[];
  hearing: HearingView;
  revealStance?: boolean;
}) {
  return (
    <ol className="grid gap-4 md:grid-cols-2">
      {pieces.map((piece, index) => (
        <li
          key={piece.id}
          className={cn('grid content-start gap-2 surface p-4', ENTER)}
          // Les témoins entrent l'un après l'autre, sans bloquer la lecture.
          style={{ animationDelay: `${index * 70}ms` }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-primary">Pièce n° {piece.number}</span>
            <ToneBadge>{EVIDENCE_STRENGTH_LABELS[piece.strength]}</ToneBadge>
            {revealStance && <EvidenceStanceBadge stance={piece.stance} />}
          </div>
          <p className="font-medium">{piece.title}</p>
          <p className="text-pretty">{piece.content}</p>
          <p className="text-muted-foreground text-sm">
            {piece.sourceName} · {formatDate(piece.publishedAt)}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {hearing.prosecution.cited.includes(piece.number) && (
              <ToneBadge tone="warning">Citée par l’accusation</ToneBadge>
            )}
            {hearing.defense.cited.includes(piece.number) && (
              <ToneBadge tone="info">Citée par la défense</ToneBadge>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function FindingList({
  title,
  icon,
  items,
  empty,
}: {
  title: string;
  icon: ReactNode;
  items: string[];
  empty: string;
}) {
  return (
    <section className="grid content-start gap-2 surface p-4">
      <h3 className="flex items-center gap-2 font-semibold">
        {icon}
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">{empty}</p>
      ) : (
        <ul className="grid gap-1.5">
          {items.map((item) => (
            <li key={item} className="text-pretty">
              {item}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function Verdict({ hearing }: { hearing: HearingView }) {
  const { certainty, vote, findings } = hearing;
  if (!certainty) return null;
  const voteMatches = vote ? VOTE_MATCHING_CERTAINTY[certainty] === vote : null;

  return (
    <div className="grid gap-6">
      <div className={cn('grid gap-3', ENTER)}>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-muted-foreground">Conclusion du juge</span>
          <CertaintyBadge level={certainty} />
        </div>
        <p className="text-muted-foreground text-sm">
          Règle appliquée : {CERTAINTY_CRITERIA[certainty]}
        </p>
        <p className="max-w-prose text-pretty text-xl leading-relaxed">{hearing.conclusion}</p>
        {hearing.conclusion && (
          <SpeakButton text={hearing.conclusion} label="Écouter la conclusion" />
        )}
      </div>

      <div className={cn('grid gap-4 md:grid-cols-3 [animation-delay:100ms]', ENTER)}>
        <FindingList
          title="Confirmé"
          icon={<CircleCheck aria-hidden className="size-5 text-success" />}
          items={findings?.confirmed ?? []}
          empty="Rien n’est confirmé par une pièce."
        />
        <FindingList
          title="Contesté"
          icon={<CircleX aria-hidden className="size-5 text-danger" />}
          items={findings?.contested ?? []}
          empty="Rien n’est contredit par une pièce."
        />
        <FindingList
          title="Manquant"
          icon={<CircleDashed aria-hidden className="size-5 text-muted-foreground" />}
          items={findings?.missing ?? []}
          empty="Chaque affirmation a au moins une pièce."
        />
      </div>

      <div className={cn('grid gap-4 md:grid-cols-2 [animation-delay:200ms]', ENTER)}>
        {vote && (
          <div
            className={cn(
              'grid gap-1 rounded-xl p-4',
              voteMatches ? 'bg-success-soft' : 'bg-warning-soft',
            )}
          >
            <p className="font-semibold">Votre vote : {VOTE_LABELS[vote]}</p>
            <p className={voteMatches ? 'text-success' : 'text-warning'}>
              {voteMatches
                ? 'Il rejoint la conclusion du juge.'
                : `La conclusion appelait plutôt « ${VOTE_LABELS[VOTE_MATCHING_CERTAINTY[certainty]]} ».`}
            </p>
          </div>
        )}
        {hearing.whatToCheck && (
          <div className="grid gap-1 rounded-xl bg-accent p-4 text-accent-foreground">
            <p className="flex items-center gap-2 font-semibold">
              <Lightbulb aria-hidden className="size-5" />
              Ce qu’il fallait regarder
            </p>
            <p className="text-pretty">{hearing.whatToCheck}</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <AiNotice className="flex-1" />
        {hearing.verdictSource && <AiSourceBadge source={hearing.verdictSource} />}
      </div>
    </div>
  );
}
