# API mobile (`/api/v1`)

Pour l'application mobile (dépôt `vyra-mobile`). JSON partout. Le site garde ses server actions ;
ces routes appellent les mêmes fonctions. Les chemins du tableau sont relatifs à `/api/v1`. Les objets abrégés du tableau décrivent les champs, sans être des exemples JSON à copier. La liste des routes disponibles n’est pas la liste des écrans déjà implémentés dans le client mobile.

## Connexion

`POST /api/v1/auth/login` avec `{ "email": "rasoa@vyra.demo", "password": "vyra-demo" }` renvoie
`{ "token", "expiresAt", "profile": { id, name, role, headline } }`. Le jeton est une session de
30 jours (la même table que le cookie du site) : à envoyer ensuite dans l'en-tête
`Authorization: Bearer <jeton>`.

`POST /api/v1/auth/logout` ferme la session du jeton envoyé.

`POST /api/v1/auth/signup` avec les champs `name`, `email`, `password` crée le compte (mêmes règles que
le site, e-mail de confirmation envoyé) et renvoie la même session que `login` (409 si l'adresse est
prise). `POST /api/v1/auth/forgot-password` avec `{ "email": "vous@example.org" }` envoie le lien de réinitialisation
(il s'ouvre sur le site) et répond toujours `{ "sent": true }`.

À l’inscription : nom de 2 à 60 caractères ; mot de passe de 8 à 128 caractères, absent de la liste de mots courants et ne reprenant pas le nom ou l’e-mail. La connexion vérifie aussi les anciennes empreintes et les met à niveau si nécessaire ; elle n’applique pas rétroactivement ces règles de création au mot de passe saisi.

Comptes de démo (mode démo seulement) : `GET /api/v1/auth/demo` liste les profils (vide hors démo),
`POST /api/v1/auth/demo` avec `{ "profileId" }` renvoie leur session.

## Routes

Le jeton est requis sauf pour la connexion, l’inscription, la demande de réinitialisation, la liste/connexion de démo quand activée, `/check`, `/seal` et `/seal/check`. Les vérifications de droits restent faites par les fonctions du site.

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
| `POST /assistant` | `{ question, pathname?, history? }` → `{ answer, citations[], references[], proposals[], autorun, searchNotice?, source }`. `references` : `{ number, title, href, label, publishedAt }`. `proposals` : au plus trois actions `{ type, label, href, now? }` ; `autorun` est le chemin d’une navigation explicitement demandée, sinon `null`. Les enquêtes et signalements attendent une confirmation. Le serveur filtre les routes absentes du mobile et transforme les audiences en dossiers. Le client doit mapper les chemins du site à ses propres routes et implémenter leur ouverture ; la conversation vocale continue est actuellement une interface du site. |
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
| `POST /scan/link` | `{ url, text? }` : la page lue, ses affirmations, son âge, les vérifications publiées et `signals` (signes d’alerte du texte, sans IA) ; pour enquêter, `POST /cases` avec `mainClaim` |
| `POST /scans/:id/case` | verser les indices d'un scan au dossier : `{ caseId }` → `{ caseId, added }` |
| `POST /scans/:id/open-case` | ouvrir une enquête depuis ce que dit le son d'un scan → `{ caseId }` |

## Erreurs

Toujours `{ "error": { "code", "message", "fieldErrors"? } }`, avec un code de `src/lib/errors.ts`.
Statuts : 400 validation, 401 non connecté ou identifiants faux, 403 réservé aux vérificateurs,
404 introuvable, 409 rien à verser, déjà signalé ou adresse prise, 413 fichier trop lourd, 415 type non pris en charge, 422 vidéo
illisible, 429 trop de demandes, 503 IA ou recherche indisponible.
`source` vaut `gemini` (réponse d'un modèle) ou `fallback` (réponse préparée ou construite sans modèle, que la cause soit un quota, une panne, une configuration absente ou le mode démo hors ligne).

## Périmètre du client

Le tribunal interactif (audience et vote) et le jeu n’ont pas de routes mobiles dédiées et restent sur le site. Le client mobile `main`, relu après mise à jour sur `2548e7e`, contient Fil, Enquêtes, Scan, Alertes et Compte, avec un assistant flottant. Ses scans couvrent image, vidéo, vocal, lien, texte, institution et sceau ; il propose les outils d’enquête et l’annuaire. Les nouveaux champs `references`, `autorun`, `searchNotice` de l’assistant et la conversation vocale continue du site nécessitent encore leur prise en charge dans ce client. Consulter son README pour la version effectivement présentée.
