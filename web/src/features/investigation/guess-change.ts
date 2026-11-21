import type { ChangeType, LinkConfidence } from '@/lib/domain';
import { diffWords } from './word-diff';

// Quand l'IA ne répond pas : une estimation du changement entre deux versions, d'après les mots
// ajoutés et retirés. La confiance reste faible, et la note le dit.

const ALARM_WORDS = /\b(urgent|alerte|partagez|vite|scandale|cache|mensonge|danger|attention)\b|!/i;

export function guessChange(
  before: string,
  after: string,
): { changeType: ChangeType; note: string; confidence: LinkConfidence } {
  const diff = diffWords(before, after);
  const added = diff.after.filter((part) => part.kind === 'added').map((part) => part.text);
  const removed = diff.before.filter((part) => part.kind === 'removed').map((part) => part.text);
  const kept = diff.after.filter((part) => part.kind === 'same').map((part) => part.text);
  const length = (parts: string[]) => parts.join(' ').trim().length;

  let changeType: ChangeType = 'title_changed';
  let note = 'La formulation change.';
  if (added.some((text) => ALARM_WORDS.test(text))) {
    changeType = 'tone_hardened';
    note = 'Des mots d’alerte ou d’accusation apparaissent.';
  } else if (added.some((text) => /\d/.test(text))) {
    changeType = 'figure_changed';
    note = 'Des chiffres ou des dates apparaissent ou changent.';
  } else if (length(removed) > length(added) * 2 && length(removed) > 40) {
    changeType = 'passage_cut';
    note = 'Une partie du texte disparaît.';
  } else if (length(kept) > (length(added) + length(removed)) * 4) {
    changeType = 'shared_unchanged';
    note = 'Le texte est repris presque à l’identique.';
  }
  return { changeType, note: `Estimation sans IA : ${note}`, confidence: 'low' };
}
