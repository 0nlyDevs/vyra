# Architecture

## Vue d'ensemble

```
                    ┌──────────────────────────────────────────────────────────┐
                    │  PC de démo, tout en local                               │
                    │                                                          │
Navigateur ────────▶│  web/  Next.js (port 3000)                               │
(projeté en direct) │   • pages grand écran (React, shadcn/ui)                 │
                    │   • server actions (logique métier)                      │
                    │   • connexion de démo (choix d'un profil)                │
                    │   • seul accès à la base ────────────────────────────────┼──▶ Postgres + pgvector
                    │        │                                                 │    (Docker, port 5433)
                    │        │ HTTP, depuis src/server/processing.ts seulement │
                    │        ▼                                                 │
                    │  processing/  FastAPI (127.0.0.1:8000)                   │
                    │   • prompts d'IA (app/prompts/*.md) ─────────────────────┼──▶ API Gemini (wifi)
                    │   • vecteurs pour la recherche par le sens               │
                    │   • réponses de secours (app/fallbacks/*.json)           │
                    └──────────────────────────────────────────────────────────┘
```

## Qui possède quoi

| | `web/` (Next.js) | `processing/` (FastAPI) |
|---|---|---|
| Rôle | Interface et logique métier | IA et calculs en Python |
| Appelé par | Le navigateur | Uniquement `web/src/server/processing.ts` |
| Base de données | **Seul propriétaire** (Drizzle) | Aucun accès |
| Utilisateurs | Profil de démo en cookie | Ne les connaît pas |
| Variables | `web/.env.local` | `processing/.env` (clé Gemini) |

## L'arborescence

```
web/src/
├── app/                  pages (App Router) ; (app)/ = espace connecté
├── components/ui/        composants shadcn (bouton, carte, champ, tableau…)
├── components/form/      champs de formulaire accessibles
├── components/states/    vide, chargement, erreur
├── features/<nom>/       une fonctionnalité = un dossier (actions, schéma Zod, composants)
├── lib/                  env.ts, erreurs, ActionResult, logger, domain.ts
└── server/
    ├── db/schema.ts      toutes les tables (Drizzle)
    ├── dal/              accès aux données
    ├── demo/seed-data.ts données de démo (make seed, bouton « Réinitialiser »)
    ├── session.ts        profil de démo en cookie
    └── processing.ts     seul appel vers FastAPI : runPrompt(), embedTexts()

processing/app/
├── routers/              /health, /v1/prompts/{nom}, /v1/embeddings
├── services/gemini.py    appels à l'API Gemini (REST)
├── services/ai_service.py Gemini d'abord, réponse de secours ensuite
├── prompts/<nom>.md      consignes données au modèle
└── fallbacks/<nom>.json  réponses montrées si Gemini ne répond pas
```

## Ajouter une fonctionnalité

1. Les tables : dans `web/src/server/db/schema.ts`, puis `make db-push`.
2. Les données de démo : dans `web/src/server/demo/seed-data.ts`, puis `make seed`.
3. L'accès aux données : `web/src/server/dal/<nom>.ts`.
4. Le dossier `web/src/features/<nom>/` : `schema.ts` (Zod), `actions.ts` (server actions),
   composants. Copier `features/notes/`, l'exemple complet.
5. La page : `web/src/app/(app)/<route>/page.tsx`.

## Ajouter un appel à l'IA

1. Écrire la consigne `processing/app/prompts/<nom>.md` : le JSON reçu, le JSON attendu.
2. Écrire la réponse de secours `processing/app/fallbacks/<nom>.json`, de la même forme.
3. Côté web : `runPrompt('<nom>', payload, schémaZod)` depuis une server action.

Sans clé Gemini, wifi coupé ou `DEMO_OFFLINE=true`, la réponse de secours s'affiche : la démo
continue. `GET http://127.0.0.1:8000/health` indique le mode (`gemini`, `offline`, `not-configured`).

## Recherche par le sens (pgvector)

`embedTexts()` renvoie un vecteur de 768 nombres par texte (Gemini). On le range dans une colonne
`vector` (voir `notes.embedding`) et on trie par `cosineDistance` (voir `server/dal/notes.ts`).
Sans IA, la recherche repasse par mots (`ilike`).

## Choix techniques

| Choix | Raison |
|---|---|
| Next.js + FastAPI | L'équipe connaît (WebCup) ; Python pour l'IA |
| Postgres + pgvector dans Docker | Même base pour tous en une commande ; recherche par le sens |
| Drizzle, sans migrations (`db-push`) | Connu de l'équipe ; à 5 en 24 h, pas de conflits de migrations |
| Gemini en REST (httpx) | Événement Google ; aucune dépendance de plus |
| Réponses de secours | Le wifi de la salle est le plus grand risque de la démo |
| Connexion de démo sans mot de passe | Le jury ne teste pas l'application |
