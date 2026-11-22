import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  autorunHref,
  buildProposals,
  fallbackProposals,
  MAX_PROPOSALS,
  mobileProposals,
} from './proposals';

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

describe('mobileProposals', () => {
  it('mène au dossier au lieu du tribunal, et écarte le jeu', () => {
    const id = '0f8d1c2e-1111-4222-8333-444455556666';
    const kept = mobileProposals([
      { type: 'open_court', label: 'Voir l’audience : La photo', href: `/court/${id}` },
      { type: 'open_page', label: 'Ouvrir le tribunal', href: '/court' },
      { type: 'open_page', label: 'Jouer à Vrai ou fake ?', href: '/game' },
      { type: 'report', label: 'Signaler ce contenu', href: '/reports?text=abc' },
    ]);
    assert.deepEqual(
      kept.map((proposal) => proposal.href),
      [`/cases/${id}`, '/reports?text=abc'],
    );
    assert.equal(kept[0].label, 'Ouvrir l’affaire : La photo');
  });
});

describe('exécution immédiate', () => {
  const rows2 = [{ id: 'aaa', title: 'La photo de l’inondation', status: 'concluded' }];

  it('n’exécute rien sans demande explicite, même si le modèle le réclame', () => {
    const raw = [{ type: 'open_page', page: 'scan', now: true }];
    assert.equal(buildProposals(raw, rows2)[0].now, undefined);
    assert.equal(autorunHref(buildProposals(raw, rows2)), null);
  });

  it('exécute une navigation demandée', () => {
    const raw = [{ type: 'open_court', case: 1, now: true }];
    const proposals = buildProposals(raw, rows2, { allowNow: true });
    assert.equal(proposals[0].now, true);
    assert.equal(autorunHref(proposals), '/court/aaa');
  });

  it('n’exécute jamais un signalement ni une enquête, même demandés', () => {
    const text = 'Une rumeur inquiétante sur la ville';
    const raw = [
      { type: 'report', text, now: true },
      { type: 'start_investigation', text, now: true },
    ];
    const proposals = buildProposals(raw, rows2, { allowNow: true });
    assert.equal(proposals.length, 2);
    assert.equal(autorunHref(proposals), null);
  });
});
