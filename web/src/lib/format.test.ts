import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatDate, formatRelative } from './format';

const now = new Date('2026-11-22T10:00:00Z');

describe('formatRelative', () => {
  it('dit les minutes, les heures puis les jours', () => {
    assert.equal(formatRelative(new Date('2026-11-22T09:30:00Z'), now), 'il y a 30 minutes');
    assert.equal(formatRelative(new Date('2026-11-22T07:00:00Z'), now), 'il y a 3 heures');
    assert.equal(formatRelative(new Date('2026-11-20T10:00:00Z'), now), 'avant-hier');
  });

  it('ne plante pas sans date', () => {
    assert.equal(formatRelative(null, now), 'Date inconnue');
    assert.equal(formatDate(undefined), 'Date inconnue');
  });
});
