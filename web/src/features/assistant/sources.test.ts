import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildExternal, buildReferences, externalForModel } from './sources';

const wiki = (url: string, title = 'T') => ({
  url,
  title,
  language: 'fr',
  summary: `Résumé de ${title}`,
});
const check = (url: string, publisher = 'AFP Factuel') => ({
  url,
  title: 'Vérification',
  publisher,
  rating: 'Faux',
  excerpt: 'Extrait',
});

describe('buildExternal', () => {
  it('met les vérifications avant Wikipédia et numérote à partir de 1', () => {
    const items = buildExternal(
      [wiki('https://fr.wikipedia.org/wiki/Peste')],
      [check('https://afp.example/v')],
    );
    assert.deepEqual(
      items.map((item) => [item.number, item.kind]),
      [
        [1, 'verification'],
        [2, 'wikipedia'],
      ],
    );
  });

  it('écarte une adresse qui n’est pas en https, ou qui n’est pas Wikipédia', () => {
    const items = buildExternal(
      [
        wiki('http://fr.wikipedia.org/wiki/A'),
        wiki('https://pirate.example/wiki/B'),
        wiki('https://mg.wikipedia.org/wiki/C', 'C'),
      ],
      [check('javascript:alert(1)'), check('http://autre.example/x')],
    );
    assert.deepEqual(
      items.map((item) => item.title),
      ['C'],
    );
  });

  it('borne le nombre de sources et la longueur du texte', () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      wiki(`https://fr.wikipedia.org/wiki/${i}`, `P${i}`),
    );
    const items = buildExternal(many, []);
    assert.equal(items.length, 4);
    const long = buildExternal(
      [{ ...wiki('https://fr.wikipedia.org/wiki/X'), summary: 'a'.repeat(5000) }],
      [],
    );
    assert.ok(long[0].text.length <= 600);
  });
});

describe('externalForModel', () => {
  it('ne donne jamais l’adresse au modèle', () => {
    const [item] = externalForModel(
      buildExternal([wiki('https://fr.wikipedia.org/wiki/Peste')], []),
    );
    assert.ok(!('url' in item));
  });
});

describe('buildReferences', () => {
  const items = buildExternal(
    [wiki('https://fr.wikipedia.org/wiki/Peste', 'Peste')],
    [check('https://afp.example/v')],
  );

  it('construit les liens des sources citées, sans doublon', () => {
    const refs = buildReferences([2, 2, 1], items);
    assert.deepEqual(
      refs.map((ref) => ref.number),
      [2, 1],
    );
    assert.equal(refs[0].href, 'https://fr.wikipedia.org/wiki/Peste');
  });

  it('ignore une source qui n’existe pas', () => {
    assert.deepEqual(buildReferences([0, 9], items), []);
  });
});
