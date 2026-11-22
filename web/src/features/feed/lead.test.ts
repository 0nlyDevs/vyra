import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { FeedStatus } from '@/lib/domain';
import type { FeedItem } from '@/server/dal/feed';
import { layoutFeed } from './lead';

const item = (id: string, imageUrl: string | null = null) => ({ id, imageUrl }) as FeedItem;

describe('layoutFeed', () => {
  it('ne perd et ne double aucune publication', () => {
    const items = Array.from({ length: 30 }, (_, i) => item(`p${i}`, i % 3 === 0 ? 'x.jpg' : null));
    const { lead, sides, rest } = layoutFeed(items, () => 'unverified');
    const ids = [lead, ...sides, ...rest].map((entry) => entry?.id);
    assert.equal(ids.length, 30);
    assert.equal(new Set(ids).size, 30);
  });

  it('met en une la publication signalée qui a une image', () => {
    const items = [item('a'), item('b', 'b.jpg'), item('c', 'c.jpg'), item('d')];
    const status: Record<string, FeedStatus> = {
      a: 'unverified',
      b: 'unverified',
      c: 'reported',
      d: 'unverified',
    };
    assert.equal(layoutFeed(items, (entry) => status[entry.id]).lead?.id, 'c');
  });

  it('passe une affaire déjà conclue après le reste', () => {
    // À image égale, l'affaire réglée cède la place à une publication encore à examiner.
    const items = [item('a', 'a.jpg'), item('b', 'b.jpg')];
    const { lead } = layoutFeed(items, (entry) => (entry.id === 'a' ? 'concluded' : 'unverified'));
    assert.equal(lead?.id, 'b');
  });

  it('garde au plus trois histoires et accepte un fil vide', () => {
    const items = Array.from({ length: 10 }, (_, i) => item(`p${i}`, 'x.jpg'));
    assert.equal(layoutFeed(items, () => 'unverified').sides.length, 3);
    const empty = layoutFeed([], () => 'unverified');
    assert.equal(empty.lead, null);
    assert.deepEqual(empty.sides, []);
  });
});
