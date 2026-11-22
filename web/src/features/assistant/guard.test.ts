import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { guardAnswer, NO_VERDICT_ANSWER } from './guard';

describe('guardAnswer', () => {
  it('laisse passer une réponse qui cite une affaire', () => {
    const text = 'Cette affaire est contredite [1].';
    assert.deepEqual(guardAnswer(text, 1), { answer: text, guarded: false });
  });

  it('remplace une réponse qui tranche sans citer une affaire jugée', () => {
    for (const verdict of [
      'C’est vrai, vous pouvez le partager.',
      "Oui, c'est totalement faux.",
      'Cette information est un fake.',
    ]) {
      const result = guardAnswer(verdict, 0);
      assert.equal(result.answer, NO_VERDICT_ANSWER, verdict);
      assert.equal(result.guarded, true);
    }
  });

  it('accepte « vrai » ou « faux » quand une affaire est citée', () => {
    assert.equal(guardAnswer('La conclusion du tribunal : c’est faux [2].', 1).guarded, false);
  });

  it('retire les liens que le modèle aurait inventés', () => {
    const result = guardAnswer(
      'Voir https://exemple.mg/faux et www.piege.com pour plus de détails [1].',
      1,
    );
    assert.ok(!/https?:|www\./.test(result.answer));
    assert.equal(result.guarded, true);
  });

  it('borne la longueur en coupant à une phrase', () => {
    const long = `${'Une phrase de remplissage. '.repeat(100)}`;
    const result = guardAnswer(long, 1);
    assert.ok(result.answer.length <= 1_201);
    assert.equal(result.guarded, true);
  });
});
