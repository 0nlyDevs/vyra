# Règles pour les assistants IA de code

Ce fichier s'adresse à tout assistant IA qui travaille dans ce dépôt.

## Le principe : la démo d'abord

Le jury ne teste pas l'application : il regarde une **démo en direct** et écoute la présentation.
Ce qui compte, dans l'ordre :

1. **Le parcours de la démo marche à chaque fois** (`docs/DEMO.md`), avec les données de démo.
2. **Ce qui se voit à l'écran est beau et lisible au projecteur.**
3. **L'IA est visible** dans la démo, avec une réponse de secours si le wifi tombe.

Ne pas passer de temps sur : la sécurité du code (droits fins, limites de tentatives…), les
tests (au-delà de l'existant), le déploiement, la CI, la traduction (français seulement), les
cas limites qu'on ne montrera pas. Des données simulées sont acceptées.

## À lire avant de coder

1. `docs/ARCHITECTURE.md` : qui fait quoi entre `web/` et `processing/`.
2. `docs/CONVENTIONS.md` : les règles de code.
3. `web/AGENTS.md` pour du code Next.js (version récente : lire la doc de `web/node_modules/next/dist/docs/`).
4. L'exemple complet `web/src/features/notes/` : une fonctionnalité se calque dessus.
5. `docs/FRONT.md` et la page `/kit` : la base de l'interface, à réutiliser avant de créer un composant.
6. **Pour tout travail d'interface : les skills front de l'équipe, au début de la tâche**, avant d'écrire
   la première ligne (`docs/FRONT.md` dit lequel consulter selon le besoin).

## Commandes

Tout tourne dans Docker (`docker compose up --build`) : Node et Python ne sont pas
forcément installés sur le PC. Les commandes passent par `docker compose exec`.

| Besoin | Commande (depuis la racine) |
|---|---|
| Tout vérifier | `make check` (Windows : les commandes de la cible `check` du `Makefile`) |
| Corriger le style | `make lint-fix` |
| Après un changement du schéma | `make db-push` |
| Données de démo à zéro | `make seed` |
| Ajouter un paquet (avec accord) | `docker compose exec web npm install <paquet>` |

Une tâche n'est terminée que si `make check` passe et que la page concernée s'affiche.
L'équipe travaille sur Mac, Linux et Windows : pas de commande ni de chemin propre à un système.

## Obligatoire

- **Next.js (`web`) possède la base.** `processing` (FastAPI) ne fait que de l'IA et des
  calculs, et n'est appelé que depuis `web/src/server/processing.ts`.
- Toute server action qui modifie des données : connexion → validation Zod → droits → DAL.
- Code et noms en anglais ; textes de l'interface, messages et documentation en français.
- Réutiliser l'existant (`src/components/ui/`, `src/components/common/`, `src/lib/errors.ts`, DAL)
  avant de créer.
- Interface : consulter les skills front d'abord, puis le kit (`/kit`), puis seulement créer.
- Un prompt d'IA = `processing/app/prompts/<nom>.md` + sa réponse de secours `processing/app/fallbacks/<nom>.json`.
- Un prompt doit marcher avec Gemini **et** avec le modèle local (Gemma 4) : la démo tourne en
  local (`AI_MODE=local`). Pas de fonction propre à un seul fournisseur.
- Modifications ciblées : ne pas reformater ce qui n'est pas lié à la tâche.
- **Avant chaque PR, se mettre à jour avec `main`** : `git fetch origin && git merge origin/main`
  (pas de rebase sur une branche déjà poussée), régler les conflits, relancer `make check`, puis
  pousser. Valable pour tout le monde, humain ou assistant.

## Interdit

- Écrire une clé ou un mot de passe réel dans le code ou un log (les clés vont dans les `.env`).
- Lire `process.env` ailleurs que dans `web/src/lib/env.ts`, ou l'environnement Python ailleurs
  que dans `processing/app/core/config.py`.
- `any`, `console.*`, `print`, `requests`.
- Ajouter une dépendance sans l'accord d'un humain de l'équipe.
- Écrire en dur une valeur de statut ou de rôle : utiliser `web/src/lib/domain.ts`.
- `git push --force`, `--no-verify`, ou toute action irréversible sans accord explicite.
- Ajouter dans un commit, une PR ou un fichier une ligne de co-auteur, une signature ou une
  mention de l'outil qui a généré le code.
