import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { FeedItem } from '@/server/dal/feed';
import { groupTopics } from './topics';

const post = (id: string, sourceName: string, kind = 'press', title: string | null = null) =>
  ({
    id,
    sourceName,
    kind,
    title,
    body: id,
    publishedAt: new Date(2026, 10, 21, Number(id.slice(1))),
  }) as FeedItem;

describe('groupTopics', () => {
  it('regroupe les publications reliées de sources différentes en un sujet', () => {
    const items = [
      post('p1', 'RFI', 'press', 'Titre RFI'),
      post('p2', 'Mastodon', 'social'),
      post('p3', 'Autre'),
    ];
    const { topics, byItem } = groupTopics(items, [['p1', 'p2']]);
    assert.equal(topics.length, 1);
    assert.equal(topics[0].sources, 2);
    assert.equal(topics[0].label, 'Titre RFI');
    assert.ok(byItem.has('p1') && byItem.has('p2'));
    assert.ok(!byItem.has('p3'));
  });

  it('ne fait pas un sujet d’une seule source', () => {
    const items = [post('p1', 'RFI'), post('p2', 'RFI')];
    assert.equal(groupTopics(items, [['p1', 'p2']]).topics.length, 0);
  });

  it('ne fait pas un sujet de recherches Google seules', () => {
    const items = [
      post('p1', 'Tendances · France', 'trend'),
      post('p2', 'Tendances · Brésil', 'trend'),
    ];
    assert.equal(groupTopics(items, [['p1', 'p2']]).topics.length, 0);
  });

  it('suit les liens de proche en proche', () => {
    const items = [post('p1', 'A', 'press', 'T'), post('p2', 'B'), post('p3', 'C')];
    const { topics } = groupTopics(items, [
      ['p1', 'p2'],
      ['p2', 'p3'],
    ]);
    assert.equal(topics.length, 1);
    assert.equal(topics[0].sources, 3);
  });

  it('ignore une paire qui parle d’une publication absente', () => {
    assert.equal(groupTopics([post('p1', 'A')], [['p1', 'zz']]).topics.length, 0);
  });
});
