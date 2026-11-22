import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isCommonPassword, repeatsIdentity } from './common-passwords';
import { resetPasswordSchema, signUpSchema } from './schema';

const account = { name: 'Hery', email: 'hery.rabe@exemple.mg' };

describe('mots de passe refusés', () => {
  it('refuse les plus courants, quelle que soit la casse', () => {
    for (const password of [
      '12345678',
      'password',
      'Password1',
      'AZERTYUIOP',
      'motdepasse',
      'madagascar',
    ]) {
      assert.equal(isCommonPassword(password), true, password);
    }
  });

  it('refuse un seul caractère répété', () => {
    assert.equal(isCommonPassword('aaaaaaaa'), true);
    assert.equal(isCommonPassword('99999999'), true);
  });

  it('accepte un mot de passe peu courant', () => {
    assert.equal(isCommonPassword('pirogue-lemur-vanille'), false);
  });

  it('refuse le nom ou l’adresse e-mail comme mot de passe', () => {
    assert.equal(repeatsIdentity('HERY.RABE@exemple.mg', account), true);
    assert.equal(repeatsIdentity('hery.rabe', account), true);
    assert.equal(repeatsIdentity('hery-et-sa-pirogue', account), false);
  });
});

describe('formulaires de mot de passe', () => {
  it('l’inscription refuse un mot de passe courant', () => {
    const result = signUpSchema.safeParse({ ...account, password: '12345678' });
    assert.equal(result.success, false);
    assert.deepEqual(
      result.error?.issues.map((issue) => issue.path[0]),
      ['password'],
    );
  });

  it('l’inscription refuse l’adresse e-mail comme mot de passe', () => {
    const result = signUpSchema.safeParse({ ...account, password: 'hery.rabe@exemple.mg' });
    assert.equal(result.success, false);
    assert.deepEqual(
      result.error?.issues.map((issue) => issue.path[0]),
      ['password'],
    );
  });

  it('l’inscription accepte un mot de passe peu courant', () => {
    assert.equal(
      signUpSchema.safeParse({ ...account, password: 'pirogue-lemur-vanille' }).success,
      true,
    );
  });

  it('le nouveau mot de passe oublié suit la même règle', () => {
    const token = 'x'.repeat(43);
    assert.equal(
      resetPasswordSchema.safeParse({ token, password: 'password1', confirm: 'password1' }).success,
      false,
    );
  });
});
