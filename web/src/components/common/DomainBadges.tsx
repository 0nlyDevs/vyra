import { Sparkles, WifiOff } from 'lucide-react';
import {
  AI_SOURCE_LABELS,
  type AiSource,
  CASE_STATUS_LABELS,
  CASE_STATUS_TONES,
  type CaseStatus,
  CERTAINTY_LABELS,
  CERTAINTY_TONES,
  type CertaintyLevel,
  EVIDENCE_STANCE_LABELS,
  EVIDENCE_STANCE_TONES,
  type EvidenceStance,
} from '@/lib/domain';
import { ToneBadge } from './ToneBadge';

// Badges métier : le libellé et la couleur viennent de src/lib/domain.ts, jamais d'un texte en dur.

export function CertaintyBadge({ level }: { level: CertaintyLevel }) {
  return <ToneBadge tone={CERTAINTY_TONES[level]}>{CERTAINTY_LABELS[level]}</ToneBadge>;
}

export function CaseStatusBadge({ status }: { status: CaseStatus }) {
  return <ToneBadge tone={CASE_STATUS_TONES[status]}>{CASE_STATUS_LABELS[status]}</ToneBadge>;
}

export function EvidenceStanceBadge({ stance }: { stance: EvidenceStance }) {
  return (
    <ToneBadge tone={EVIDENCE_STANCE_TONES[stance]}>{EVIDENCE_STANCE_LABELS[stance]}</ToneBadge>
  );
}

// À afficher à côté de toute réponse d'IA : le jury voit si elle vient de l'IA ou du plan B.
export function AiSourceBadge({ source }: { source: AiSource }) {
  const Icon = source === 'gemini' ? Sparkles : WifiOff;
  return (
    <ToneBadge tone={source === 'gemini' ? 'info' : 'neutral'}>
      <Icon aria-hidden />
      {AI_SOURCE_LABELS[source]}
    </ToneBadge>
  );
}
