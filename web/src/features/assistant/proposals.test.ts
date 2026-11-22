import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildProposals, fallbackProposals, MAX_PROPOSALS } from './proposals';

const rows = [
  { id: 'aaa', title: 'La photo de l’inondation', status: 'concluded' },
  { id: 'bbb', title: 'Le recrutement à 500 postes', status: 'open' },
];

describe('buildProposals', () => {
  it('construit les liens lui-même, jamais depuis le modèle', () => {
    const [proposal] = buildProposals(
      [{ type: 'open_court', case: 1, href: 'https://pirate.test' }],
      rows,
    );
    assert.equal(proposal.href, '/court/aaa');
    assert.ok(!proposal.href.includes('pirate'));
  });

  it('envoie une affaire non conclue vers son dossier, pas vers un tribunal vide', () => {
    assert.equal(buildProposals([{ type: 'open_court', case: 2 }], rows)[0].href, '/cases/bbb');
  });

  it('écarte une affaire qui n’a pas été fournie au modèle', () => {
    assert.deepEqual(
      buildProposals(
        [
          { type: 'open_case', case: 9 },
          { type: 'open_case', case: 0 },
        ],
        rows,
      ),
      [],
    );
  });

  it('écarte les types inconnus, les pages hors liste et les données mal formées', () => {
    const raw = [
      { type: 'delete_case', case: 1 },
      { type: 'open_page', page: 'admin' },
      { type: 'open_page' },
      'ouvre tout',
      null,
      { type: 'report', text: 12 },
    ];
    assert.deepEqual(buildProposals(raw, rows), []);
  });

  it('pré-remplit un signalement ou une enquête avec un texte nettoyé et borné', () => {
    const text = `  Une rumeur   inquiétante \n sur la ville ${'x'.repeat(900)}`;
    const [report, investigation] = buildProposals(
      [
        { type: 'report', text },
        { type: 'start_investigation', text },
      ],
      rows,
    );
    assert.ok(report.href.startsWith('/reports?text='));
    assert.ok(investigation.href.startsWith('/cases?information='));
    assert.ok(decodeURIComponent(report.href.split('=')[1]).length <= 600);
    assert.ok(!decodeURIComponent(report.href).includes('  '));
  });

  it('refuse un texte trop court pour être un signalement', () => {
    assert.deepEqual(buildProposals([{ type: 'report', text: 'ok' }], rows), []);
  });

  it('ne garde que trois propositions, sans doublon', () => {
    const raw = [
      { type: 'open_page', page: 'scan' },
      { type: 'open_page', page: 'scan' },
      { type: 'open_page', page: 'feed' },
      { type: 'open_page', page: 'game' },
      { type: 'open_page', page: 'flash' },
    ];
    const result = buildProposals(raw, rows);
    assert.equal(result.length, MAX_PROPOSALS);
    assert.equal(new Set(result.map((proposal) => proposal.href)).size, MAX_PROPOSALS);
  });
});

describe('fallbackProposals', () => {
  it('propose l’audience d’une affaire jugée qui ressemble', () => {
    assert.equal(fallbackProposals('question', { id: 'aaa', title: 'T' })[0].href, '/court/aaa');
  });

  it('propose d’enquêter ou de signaler quand rien ne ressemble', () => {
    const types = fallbackProposals('Une information qui circule beaucoup en ce moment', null).map(
      (p) => p.type,
    );
    assert.deepEqual(types, ['start_investigation', 'report']);
  });
});
