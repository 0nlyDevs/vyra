# API mobile (`/api/v1`)

Pour l'application mobile (dépôt `vyra-mobile`). JSON partout. Le site garde ses server actions ;
ces routes appellent les mêmes fonctions.

## Connexion

`POST /api/v1/auth/login` avec `{ "email", "password" }` renvoie
`{ "token", "expiresAt", "profile": { id, name, role, headline } }`. Le jeton est une session de
30 jours (la même table que le cookie du site) : à envoyer ensuite dans l'en-tête
`Authorization: Bearer <jeton>`.

`POST /api/v1/auth/logout` ferme la session du jeton envoyé.

`POST /api/v1/auth/signup` avec `{ "name", "email", "password" }` crée le compte (mêmes règles que
le site, e-mail de confirmation envoyé) et renvoie la même session que `login` (409 si l'adresse est
prise). `POST /api/v1/auth/forgot-password` avec `{ "email" }` envoie le lien de réinitialisation
(il s'ouvre sur le site) et répond toujours `{ "sent": true }`.

Comptes de démo (mode démo seulement) : `GET /api/v1/auth/demo` liste les profils (vide hors démo),
`POST /api/v1/auth/demo` avec `{ "profileId" }` renvoie leur session.

## Routes (toutes avec le jeton, sauf `check`)

| Route | Rôle |
|---|---|
| `GET /me` | le profil connecté |
| `GET /feed?region=mg\|world&vue=…&sujet=…` | le fil, 7 derniers jours, rangé comme la page `/feed` : `lead`, `sides`, `rest`, `items` (tout, dans l'ordre), `views`, `topics`, `trends`, `focus` ; chaque publication porte `status` (`unverified`, `reported`, `verifying`, `concluded`) et `topic` |
| `POST /feed/:id/open` | l'affaire d'une publication, ouverte au besoin : `{ caseId }` |
| `GET /cases` | les affaires, de la plus récente à la plus ancienne ; chacune porte `imageUrl` (chemin du site, ex. `/demo/inondation-2019.png`, ou adresse complète) ou `null` |
| `POST /cases` | nouvelle analyse : `{ claim, sourceUrl?, sourceName? }` → `{ caseId, matchedBy, reason }` (affaire retrouvée ou créée) |
| `GET /cases/:id` | le dossier : `versions` (chacune avec son `imagePath` éventuel et `sourceKind`), `links`, `evidence` (avec `sourceKind`), `signals` (signes d'alerte, sans IA) |
| `POST /cases/:id/web-search` | chercher d'autres versions dans la presse : `{ status, kept, contradicting }` |
| `POST /cases/:id/fact-checks` | vérifications publiées et Wikipédia : `{ factChecks, wikipedia, searched }` |
| `POST /cases/:id/references` | verser l'une d'elles au dossier : `{ kind: fact_check\|wikipedia, url, title, content, sourceName, publishedAt }` |
| `POST /cases/:id/what-if` | What If ? : `{ kind, versions[], takeaway, source }` |
| `POST /assistant` | `{ question, pathname?, history? }` renvoie `{ answer, citations[], proposals[], source }` ; `proposals` : au plus trois actions `{ type, label, href }` que la personne confirme d'un clic (l'assistant n'exécute rien), `href` étant un chemin du site, jamais vers le tribunal ni le jeu (absents de l'application) |
| `GET /reports` | la boîte d'alertes : `{ mine, groups, isVerifier }` ; `groups` (vérificateur seulement) avec leurs `reports` |
| `POST /reports` | signaler : `{ content, url?, feedPostId?, reason, description? }` → `{ reporterCount, caseId }` (409 déjà signalé, 429 limite du jour) |
| `POST /reports/groups/:id/open-case` | ouvrir l'affaire d'un groupe sans attendre le seuil (vérificateur) : `{ caseId }` |
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
| `POST /scan/audio` | multipart `file` (un vocal) : transcription et affaire déjà jugée, comme l'onglet « Vocal » |
| `POST /scan/link` | `{ url, text? }` : la page lue, ses affirmations, son âge, les vérifications publiées ; pour enquêter, `POST /cases` avec `mainClaim` |
| `POST /scans/:id/case` | verser les indices d'un scan au dossier : `{ caseId }` → `{ caseId, added }` |
| `POST /scans/:id/open-case` | ouvrir une enquête depuis ce que dit le son d'un scan → `{ caseId }` |

## Erreurs

Toujours `{ "error": { "code", "message", "fieldErrors"? } }`, avec un code de `src/lib/errors.ts`.
Statuts : 400 validation, 401 non connecté ou identifiants faux, 403 réservé aux vérificateurs,
404 introuvable, 409 rien à verser, déjà signalé ou adresse prise, 413 fichier trop lourd, 415 type non pris en charge, 422 vidéo
illisible, 429 trop de demandes, 503 IA ou recherche indisponible.
`source` vaut `gemini` (réponse d'un modèle) ou `fallback` (réponse préparée, hors ligne).

## Pas dans l'application

Le tribunal (audience et vote) et le jeu restent sur le site : l'application montre la conclusion et
son sceau dans le dossier, sans lien vers l'audience.
