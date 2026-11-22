// Mots de passe refusés à l'inscription et au changement : les plus courants des fuites publiques
// (8 caractères ou plus, les plus courts sont déjà refusés), et ceux qu'on devine ici (français,
// Madagascar, le nom du site). Comparés en minuscules.
// shortcut: liste courte, pas la base des mots de passe fuités ; passer à Have I Been Pwned
// (k-anonymat) si les comptes deviennent une cible.
const COMMON = new Set([
  '12345678',
  '123456789',
  '1234567890',
  '12345678910',
  '0123456789',
  '87654321',
  '987654321',
  '0987654321',
  '11111111',
  '00000000',
  '12341234',
  '11223344',
  '12121212',
  '123123123',
  '147258369',
  '159753456',
  '123456789a',
  'a1234567',
  'aa123456',
  'abc12345',
  'abcd1234',
  'abcdefgh',
  '1q2w3e4r',
  '1q2w3e4r5t',
  '1qaz2wsx',
  'q1w2e3r4',
  'qwe12345',
  '123qweasd',
  'qwertyui',
  'qwertyuiop',
  'qwerty123',
  'qwerty12',
  'azertyui',
  'azertyuiop',
  'azerty123',
  'asdfghjk',
  'zxcvbnm1',
  'password',
  'password1',
  'password12',
  'password123',
  'passw0rd',
  'p@ssw0rd',
  'p@ssword',
  'motdepasse',
  'motdepasse1',
  'motdepasse123',
  'iloveyou',
  'iloveyou1',
  'jetaime1',
  'jetaime123',
  'bonjour1',
  'bonjour123',
  'soleil123',
  'chouchou',
  'doudou123',
  'loulou123',
  'sunshine',
  'princess',
  'football',
  'baseball',
  'superman',
  'starwars',
  'trustno1',
  'letmein1',
  'welcome1',
  'welcome123',
  'admin123',
  'administrator',
  'changeme',
  'computer',
  'internet',
  'whatever',
  'facebook',
  'google123',
  'samsung1',
  'madagascar',
  'madagascar1',
  'antananarivo',
  'tananarive',
  'malagasy',
  'vyra1234',
  'vyravyra',
  'vyra2026',
]);

// Courant, ou un seul caractère répété (« aaaaaaaa », « 99999999 »).
export function isCommonPassword(password: string) {
  const lower = password.toLowerCase();
  return COMMON.has(lower) || new Set(lower).size === 1;
}

// Le mot de passe reprend le nom ou l'adresse e-mail de la personne (« hery1234 » pour Hery
// n'est pas refusé ; « hery@exemple.mg » ou « Hery », si).
export function repeatsIdentity(password: string, identity: { name?: string; email?: string }) {
  const lower = password.toLowerCase();
  const email = identity.email?.trim().toLowerCase() ?? '';
  const words = [identity.name?.trim().toLowerCase(), email, email.split('@')[0]];
  return words.some((word) => !!word && lower === word);
}
