import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readDanger, readTone } from './wording';

describe('readTone', () => {
  it('lit un message urgent qui demande de partager comme sensationnel', () => {
    const reading = readTone('URGENT : inondation ce matin, partagez vite !');
    assert.equal(reading.level, 'sensational');
    const kinds = reading.signs.map((sign) => sign.kind);
    assert.ok(kinds.includes('urgency'));
    assert.ok(kinds.includes('share'));
  });

  it('laisse un message posé neutre', () => {
    const reading = readTone(
      'La commune a publié le calendrier des travaux de la route nationale.',
    );
    assert.equal(reading.level, 'neutral');
    assert.deepEqual(reading.signs, []);
  });

  it('cite des morceaux du texte d’origine, mot pour mot', () => {
    const text = 'URGENT : partagez avant qu’il ne soit trop tard';
    for (const sign of readTone(text).signs) {
      assert.ok(text.toLowerCase().includes(sign.quote.toLowerCase()), sign.quote);
    }
  });
});

describe('readDanger', () => {
  it('ne relève rien dans un texte sans panique ni accusation', () => {
    assert.equal(readDanger('Le marché de la ville ouvre à sept heures.').level, 'low');
  });

  it('monte en danger quand le message accuse ou appelle à la violence', () => {
    const reading = readDanger('Ce voleur est un escroc : tuez-le avant qu’il ne parte.');
    assert.equal(reading.level, 'high');
    assert.ok(reading.signs.some((sign) => sign.kind === 'accusation'));
  });
});
