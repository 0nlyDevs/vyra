import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { pickAssistantCases } from './context';

const rows = (...ids: string[]) => ids.map((id) => ({ id }));
const ids = (list: { id: string }[]) => list.map((row) => row.id);

describe('pickAssistantCases', () => {
  it('met les affaires les plus proches de la question avant les plus récentes', () => {
    assert.deepEqual(ids(pickAssistantCases(rows('x', 'y'), rows('a', 'b', 'c'))), [
      'x',
      'y',
      'a',
      'b',
      'c',
    ]);
  });

  it('ne cite jamais deux fois la même affaire', () => {
    assert.deepEqual(ids(pickAssistantCases(rows('a', 'x'), rows('a', 'b', 'x'))), ['a', 'x', 'b']);
  });

  it('se limite à la taille du contexte, les plus proches gardées d’abord', () => {
    const nearest = rows('n1', 'n2', 'n3');
    const recent = rows('r1', 'r2', 'r3', 'r4');
    assert.deepEqual(ids(pickAssistantCases(nearest, recent, 5)), ['n1', 'n2', 'n3', 'r1', 'r2']);
  });

  it('retombe sur les plus récentes sans vecteur', () => {
    assert.deepEqual(ids(pickAssistantCases([], rows('a', 'b'))), ['a', 'b']);
  });
});
