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
| `GET /cases/:id/seal` | le sceau de la conclusion : `{ code, url }` (le QR mène à `url`), ou `null` |
| `GET /seal/check?code=VY-…` ou `?c=&s=` | vérifier un sceau, sans compte : `{ status: genuine\|mismatch\|unknown, content?, code? }` |
| `GET /seal` | la clé publique des sceaux (JWK Ed25519), sans compte |
| `POST /impersonation` | « Est-ce bien eux ? » : `{ message, sender? }` → institution, canaux, demande d'argent, communiqué d'origine |
| `GET /directory` | l'annuaire officiel : `{ entries, canEdit }` |
| `POST /directory/institutions`, `POST /directory/notices` | ajouter (vérificateur) ; mêmes champs que le site, listes séparées par des virgules |
| `DELETE /directory/:kind/:id` | retirer une institution (`institution`) ou un communiqué (`notice`) (vérificateur) |
| `GET /scan/capabilities` | `{ video }` : l'examen des vidéos (ffmpeg) est-il disponible ? |
| `POST /scan/image` | multipart `file` (JPEG, PNG, WebP, 8 Mo) : informations du fichier, déjà vue, copie protégée (`safeCopy.dataUrl`), lecture par l'IA |
| `POST /scan/video` | multipart `file` (MP4, MOV, WebM, 3GP, 8 Mo) : informations, images clés protégées (`frames[].dataUrl`), lecture, transcription, affaire déjà jugée |
| `POST /scans/:id/case` | verser les indices d'un scan au dossier : `{ caseId }` → `{ caseId, added }` |
| `POST /scans/:id/open-case` | ouvrir une enquête depuis ce que dit le son d'un scan → `{ caseId }` |

## Erreurs

Toujours `{ "error": { "code", "message", "fieldErrors"? } }`, avec un code de `src/lib/errors.ts`.
Statuts : 400 validation, 401 non connecté ou identifiants faux, 403 réservé aux vérificateurs,
404 introuvable, 409 rien à verser, 413 fichier trop lourd, 415 type non pris en charge, 422 vidéo
illisible, 503 IA indisponible.
`source` vaut `gemini` (réponse d'un modèle) ou `fallback` (réponse préparée, hors ligne).

## Pas encore là

Scan d'un vocal seul, tribunal (audience et vote), alertes, jeu : à ajouter quand l'écran mobile
correspondant est prêt, en réutilisant la fonction du site.
