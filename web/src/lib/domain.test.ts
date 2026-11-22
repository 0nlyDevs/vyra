import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CERTAINTY_LABELS,
  CERTAINTY_LEVELS,
  CERTAINTY_TONES,
  FEED_STATUS_LABELS,
  FEED_STATUS_TONES,
  isVerifier,
  PROFILE_ROLES,
  TONES,
} from './domain';

describe('domain', () => {
  it('donne un libellé et un ton valide à chaque niveau de certitude', () => {
    for (const level of CERTAINTY_LEVELS) {
      assert.ok(CERTAINTY_LABELS[level].length > 0, level);
      assert.ok(TONES.includes(CERTAINTY_TONES[level]), level);
    }
  });

  it('donne un libellé et un ton à chaque état du fil', () => {
    for (const status of Object.keys(FEED_STATUS_LABELS) as (keyof typeof FEED_STATUS_LABELS)[]) {
      assert.ok(FEED_STATUS_LABELS[status].length > 0, status);
      assert.ok(TONES.includes(FEED_STATUS_TONES[status]), status);
    }
  });

  it('réserve les pouvoirs de vérification au rôle admin', () => {
    assert.deepEqual([...PROFILE_ROLES], ['admin', 'member']);
    assert.equal(isVerifier('admin'), true);
    assert.equal(isVerifier('member'), false);
  });
});
