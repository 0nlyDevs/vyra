import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { keepRelevantCourtCases } from './relevance';

const candidates = ['trump', 'pont', 'riz'];
const decision = (number: number, relevant: boolean) => ({ number, relevant, reason: 'Raison.' });

describe('keepRelevantCourtCases', () => {
  it('garde seulement les affaires jugées pertinentes', () => {
    const kept = keepRelevantCourtCases(
      { results: [decision(1, true), decision(2, false), decision(3, false)] },
      candidates,
    );
    assert.deepEqual(kept, [{ item: 'trump', reason: 'Raison.' }]);
  });
  it('rejette une décision manquante, dupliquée ou inventée', () => {
    assert.equal(keepRelevantCourtCases({ results: [decision(1, true)] }, candidates), null);
    assert.equal(
      keepRelevantCourtCases(
        { results: [decision(1, true), decision(1, true), decision(3, false)] },
        candidates,
      ),
      null,
    );
    assert.equal(
      keepRelevantCourtCases(
        { results: [decision(1, true), decision(2, false), decision(9, false)] },
        candidates,
      ),
      null,
    );
  });
  it('rejette une réponse mal formée', () => {
    assert.equal(keepRelevantCourtCases({ nope: true }, candidates), null);
  });
});
