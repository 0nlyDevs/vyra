import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { passwordWeakness } from './password-strength';
import { resetPasswordSchema, signUpSchema } from './schema';

const account = { name: 'Hery', email: 'hery.rabe@exemple.mg' };

describe('solidité d’un nouveau mot de passe', () => {
  it('refuse les mots de passe faciles à deviner', async () => {
    for (const password of [
      'dertgfds', // suite de touches voisines
      'azertyuiop', // ligne du clavier
      'qsdfghjk',
      '12345678',
      'password1',
      'motdepasse',
      'soleil2024',
      'madagascar1', // mot du site
      'aaaaaaaa',
    ]) {
      assert.notEqual(await passwordWeakness(password), null, password);
    }
  });

  it('explique pourquoi, en français', async () => {
    assert.match((await passwordWeakness('dertgfds')) ?? '', /clavier/);
  });

  it('refuse le nom ou l’adresse de la personne', async () => {
    assert.notEqual(
      await passwordWeakness('hery.rabe2026', ['Hery', 'hery.rabe@exemple.mg', 'hery.rabe']),
      null,
    );
  });

  it('accepte une phrase de plusieurs mots', async () => {
    assert.equal(await passwordWeakness('pirogue-lemur-vanille'), null);
  });
});

describe('formulaires de nouveau mot de passe', () => {
  it('l’inscription refuse un mot de passe faible, sur le champ du mot de passe', async () => {
    const result = await signUpSchema.safeParseAsync({ ...account, password: 'dertgfds' });
    assert.equal(result.success, false);
    assert.deepEqual(
      result.error?.issues.map((issue) => issue.path[0]),
      ['password'],
    );
  });

  it('l’inscription accepte un mot de passe solide', async () => {
    const result = await signUpSchema.safeParseAsync({
      ...account,
      password: 'pirogue-lemur-vanille',
    });
    assert.equal(result.success, true);
  });

  it('le mot de passe oublié suit la même règle', async () => {
    const token = 'x'.repeat(43);
    const weak = await resetPasswordSchema.safeParseAsync({
      token,
      password: 'dertgfds',
      confirm: 'dertgfds',
    });
    assert.equal(weak.success, false);
    const strong = 'pirogue-lemur-vanille';
    const ok = await resetPasswordSchema.safeParseAsync({
      token,
      password: strong,
      confirm: strong,
    });
    assert.equal(ok.success, true);
  });
});
