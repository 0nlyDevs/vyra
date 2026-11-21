# API mobile (`/api/v1`)

Pour l'application mobile (dépôt `vyra-mobile`). JSON partout. Le site garde ses server actions ;
ces routes appellent les mêmes fonctions.

## Connexion

`POST /api/v1/auth/login` avec `{ "email", "password" }` renvoie
`{ "token", "expiresAt", "profile": { id, name, role, headline } }`. Le jeton est une session de
30 jours (la même table que le cookie du site) : à envoyer ensuite dans l'en-tête
`Authorization: Bearer <jeton>`.

`POST /api/v1/auth/logout` ferme la session du jeton envoyé.

## Routes (toutes avec le jeton, sauf `check`)

| Route | Rôle |
|---|---|
| `GET /me` | le profil connecté |
| `GET /feed?region=mg\|world` | le fil, 7 derniers jours (`mg` : Madagascar et monde, par défaut) |
| `GET /cases` | les affaires, de la plus récente à la plus ancienne |
| `GET /cases/:id` | le dossier : `versions`, `links`, `evidence` |
| `POST /cases/:id/what-if` | What If ? : `{ kind, versions[], takeaway, source }` |
| `POST /assistant` | `{ question, pathname?, history? }` renvoie `{ answer, citations[], source }` |
| `POST /check` | vérification rapide d'un texte ou d'un lien (`{ text }` ou `{ url }`), sans compte |

## Erreurs

Toujours `{ "error": { "code", "message", "fieldErrors"? } }`, avec un code de `src/lib/errors.ts`.
Statuts : 400 validation, 401 non connecté ou identifiants faux, 404 introuvable, 503 IA indisponible.
`source` vaut `gemini` (réponse d'un modèle) ou `fallback` (réponse préparée, hors ligne).

## Pas encore là

Scan d'image ou de son, tribunal (audience et vote), alertes, jeu : à ajouter quand l'écran
mobile correspondant est prêt, en réutilisant la fonction du site.
