import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { caseSearchText, courtSearchQueries } from './search';

describe('recherche thématique du tribunal', () => {
  it('vectorise la demande et chacun de ses sujets sans exiger leur présence simultanée', () => {
    assert.deepEqual(courtSearchQueries('Poutine et Donald Trump'), [
      'Poutine et Donald Trump',
      'Poutine',
      'Donald Trump',
    ]);
    assert.deepEqual(courtSearchQueries('inondation, cyclone ou peste'), [
      'inondation, cyclone ou peste',
      'inondation',
      'cyclone',
      'peste',
    ]);
  });
  it('accepte un nom seul, déduplique les sujets et borne le nombre de vecteurs', () => {
    assert.deepEqual(courtSearchQueries(' Trump '), ['Trump']);
    assert.deepEqual(courtSearchQueries('Trump et trump'), ['Trump et trump', 'Trump']);
    assert.equal(
      courtSearchQueries('sujet1 et sujet2 et sujet3 et sujet4 et sujet5 et sujet6').length,
      5,
    );
  });
  it('inclut le titre dans le contenu indexé, pas seulement le message initial', () => {
    assert.equal(
      caseSearchText({ title: 'Donald Trump', claim: 'Le pape soutient sa candidature.' }),
      'Donald Trump. Le pape soutient sa candidature.',
    );
  });
});
