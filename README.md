# MindStack · DevFest Antananarivo 2026

Projet de l'équipe **MindStack** au hackathon du DevFest Antananarivo (21 et 22 novembre 2026).
Tout tourne en local sur un PC : le jury juge la **démo en direct** et la présentation.

## Démarrer (3 commandes)

Prérequis : **Node 22**, **Python 3.12**, **Docker Desktop lancé**, `make`.
`uv` est conseillé pour Python (`brew install uv`), sinon `venv` + `pip` sont utilisés.

```bash
make install   # paquets web + processing, et fichiers .env
make db        # Postgres + pgvector dans Docker, tables, données de démo
make dev       # web sur http://localhost:3000, processing sur http://127.0.0.1:8000
```

Pour l'IA : mettre une clé Gemini (gratuite, https://aistudio.google.com/apikey) dans
`processing/.env` (`GEMINI_API_KEY=`). Sans clé, l'application marche avec les réponses de secours.

## Commandes utiles

| Besoin | Commande |
|---|---|
| Voir toutes les commandes | `make` |
| Remettre les données de démo à zéro | `make seed` (ou le bouton « Réinitialiser la démo ») |
| Après un changement de `web/src/server/db/schema.ts` | `make db-push` |
| Voir les données | `make db-studio` |
| Tout vérifier avant de pousser | `make check` |
| Ajouter un composant shadcn | `cd web && npm run ui:add <nom>` |

## Où lire quoi

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) : qui fait quoi, comment ajouter une fonctionnalité.
- [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md) : les règles de code (courtes).
- [`docs/DEMO.md`](docs/DEMO.md) : le script de la démo et la liste à vérifier avant la scène.
- [`docs/PITCH.md`](docs/PITCH.md) : le plan de la présentation.
- [`docs/ROLES.md`](docs/ROLES.md) : qui fait quoi dans l'équipe.
- [`docs/DEVFEST.md`](docs/DEVFEST.md) : ce qu'on sait du hackathon.
