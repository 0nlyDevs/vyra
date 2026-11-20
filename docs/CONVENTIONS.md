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
- `git pull origin main` souvent : 5 personnes travaillent en même temps.
- Messages de commit en français, courts : `feat: ajoute la carte des trajets`.
- `make check` avant de pousser.
- Fins de ligne Unix (LF) partout : `.gitattributes` s'en charge, ne pas le modifier.
