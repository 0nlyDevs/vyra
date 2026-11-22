import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { feedStatusOf } from './status';

type Input = Parameters<typeof feedStatusOf>[0];
const post = (overrides: Partial<Input>): Input => ({
  case: null,
  reporterCount: 0,
  reportState: null,
  ...overrides,
});

describe('feedStatusOf', () => {
  it('range une publication sans rien en « non vérifié »', () => {
    assert.equal(feedStatusOf(post({})), 'unverified');
  });

  it('passe en « signalé » dès qu’une personne la signale', () => {
    assert.equal(feedStatusOf(post({ reporterCount: 2 })), 'reported');
  });

  it('passe en « en vérification » quand une affaire est ouverte', () => {
    const open = { id: 'c', status: 'open', certainty: null, conclusion: null };
    assert.equal(feedStatusOf(post({ case: open as Input['case'] })), 'verifying');
  });

  it('ne dit « conclu » que si l’affaire est conclue avec une certitude', () => {
    const done = { id: 'c', status: 'concluded', certainty: 'contradicted', conclusion: 'x' };
    assert.equal(feedStatusOf(post({ case: done as Input['case'] })), 'concluded');
    const noLevel = { ...done, certainty: null };
    assert.equal(feedStatusOf(post({ case: noLevel as Input['case'] })), 'verifying');
  });

  it('garde le plus avancé : une affaire conclue passe avant les signalements', () => {
    const done = { id: 'c', status: 'concluded', certainty: 'established', conclusion: 'x' };
    assert.equal(
      feedStatusOf(post({ case: done as Input['case'], reporterCount: 9 })),
      'concluded',
    );
  });
});
