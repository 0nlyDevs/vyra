# Conventions de code (version courte)

## Langues

- Code, noms de fichiers, variables, fonctions : **anglais**.
- Interface, messages d'erreur, documentation, commits : **français**.
- L'interface est en français seulement (pas de traduction).

## web (Next.js)

1. **Une fonctionnalité = un dossier** `src/features/<nom>/` : `schema.ts`, `actions.ts`, composants.
2. **Server action** : connexion (`getCurrentProfile`) → validation Zod → droits → DAL. Elle renvoie
   toujours un `ActionResult` (`ok(data)` ou `fail(ERRORS.X)`), jamais d'exception vers l'écran.
3. **La base** ne se lit que dans `src/server/` (DAL). Biome refuse `drizzle-orm` ailleurs.
4. **Les erreurs** viennent du catalogue `src/lib/errors.ts` ; on compare les codes, pas les textes.
5. **Les listes de valeurs** (rôles, statuts) vivent dans `src/lib/domain.ts`, avec leurs libellés.
6. **Les composants** de `src/components/` restent génériques : pas d'import de `server/` ni de `features/`.
7. Pas de `any`, pas de `console` (utiliser `logger`), pas de `process.env` hors de `lib/env.ts`.

## processing (FastAPI)

1. Les réglages ne se lisent que dans `app/core/config.py` (dépendance `SettingsDep`).
2. Un prompt = un `.md` dans `app/prompts/` + un `.json` de secours dans `app/fallbacks/`.
3. Pas de `print` (utiliser `logging`), pas de `requests` (utiliser `httpx`).

## Git

- Une branche par fonctionnalité (`feat/<nom>`), fusionnée vite dans `main`.
- `git pull origin main` souvent : plusieurs personnes travaillent sur le dépôt.
- Messages de commit en français, courts : `feat: ajoute la carte des trajets`.
- `make check` et `docker compose exec web npm test` avant de pousser. La CI ajoute le build, les migrations et une vérification HTTP.
- Avant chaque PR : `git fetch origin`, puis `git merge origin/main` ; pas de rebase d’une branche déjà poussée.
- Une PR se fusionne par un commit de merge, jamais en squash ni en rebase : le dépôt n’autorise
  plus que ce mode. Le titre de la PR devient celui du commit de merge, il suit donc le même
  format (`fix(web): …`) ; ne pas garder « Merge pull request #… ». Pas de push direct sur `main`.
- Un changement de `web/src/server/db/schema.ts` : `make db-push` pour tester, puis `make db-generate` et committer `web/drizzle/`.
- Mettre à jour les documents concernés dans la même modification (README, architecture, API, démo). Ne pas annoncer un contrôle non exécuté ou une capacité non présente dans le client livré.
- Fins de ligne Unix (LF) partout : `.gitattributes` s'en charge, ne pas le modifier.
