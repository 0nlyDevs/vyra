# Vyra · DevFest Antananarivo 2026

Projet **Vyra** (issu du travail de l’équipe MindStack) au hackathon du DevFest Antananarivo (21 et 22 novembre 2026).
Tout tourne en local sur un PC : le jury juge la **démo en direct** et la présentation.

## Démarrer : une seule commande, sur Mac, Linux et Windows

Prérequis : **Git** et **Docker** (Docker Desktop sur Mac et Windows). Rien d'autre : Node,
Python et Postgres tournent dans Docker. Pas de Docker (Windows surtout) : voir
[Sans Docker](#sans-docker-windows-mac-ou-linux).

```bash
git clone git@github.com:mahery-oniniaina/mindstack-devfest-2026.git
cd mindstack-devfest-2026
docker compose up --build
```

Puis ouvrir **http://localhost:3000**. Le premier lancement télécharge et installe tout
(5 à 10 minutes selon le réseau) : **le faire avant d'arriver au DevFest**. Les suivants
démarrent en quelques secondes. `Ctrl+C` arrête tout ; les données sont gardées.

Une modification du code est prise en compte toute seule, sans relancer.

### Windows : cloner dans WSL

Sous Windows, ouvrir un terminal **Ubuntu (WSL 2)** et cloner le dépôt **dans WSL**
(`~/…`), pas dans `C:\…`. Sinon Docker voit mal les modifications et tout est lent.
Docker Desktop doit avoir l'intégration WSL activée (Settings → Resources → WSL integration).
VS Code s'ouvre sur ce dossier avec `code .` depuis le terminal Ubuntu.

Dernier recours si le dépôt reste dans `C:\…` et que les modifications ne s'affichent pas :
créer un fichier `.env` à la racine avec `WATCH_POLL_INTERVAL_MS=1000`, puis relancer.

### Sans Docker (Windows, Mac ou Linux)

Pour un poste où Docker Desktop ne s'installe pas ou rame. Compter 15 minutes, wifi compris.
Les commandes ci-dessous sont pour **PowerShell** (Windows) ; sur Mac ou Linux, remplacer
`.venv\Scripts\python` par `.venv/bin/python` et `Copy-Item` par `cp`.

**1. Installer** Git, **Node 22** (https://nodejs.org, version 22) et **Python 3.12**
(https://www.python.org/downloads/, cocher « Add python.exe to PATH »).

**2. La base : Postgres gratuit chez Neon** (avec pgvector, rien à installer) :

1. Créer un compte sur https://neon.tech, puis un projet (région Europe).
2. Dans **SQL Editor**, lancer : `CREATE EXTENSION IF NOT EXISTS vector;`
3. Bouton **Connect** : décocher « Connection pooling », copier l'adresse (elle commence par
   `postgresql://` et finit par `?sslmode=require`).

Chacun a sa propre base. Elle demande le wifi.

**3. Le service processing (l'IA)**, dans un premier terminal, depuis le dossier du dépôt :

```powershell
cd processing
py -3.12 -m venv .venv
.venv\Scripts\python -m pip install -r requirements-dev.txt
Copy-Item .env.example .env
.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

Mettre sa clé Gemini dans `processing/.env` (voir [L'IA](#lia--trois-modes-gemini-par-défaut)),
puis vérifier http://127.0.0.1:8000/health.

**4. Le web**, dans un second terminal :

```powershell
cd web
Copy-Item .env.example .env.local
```

Dans `web/.env.local`, remplacer la ligne `DATABASE_URL=…` par l'adresse Neon. Puis :

```powershell
npm install
npm run db:push
npm run db:seed
npm run dev
```

Ouvrir **http://localhost:3000**.

**Les jours suivants** : seulement la dernière commande de chaque terminal (`uvicorn …` et
`npm run dev`). Après un `git pull` qui change les tables : `npm run db:push`. Remettre les
données de démo : `npm run db:seed`.

**Ce qui change sans Docker** :

- **E-mails** : Mailpit n'est pas lancé, donc les e-mails ne s'affichent nulle part (l'inscription
  marche quand même ; les comptes de démo suffisent). Pour les voir : télécharger Mailpit (un seul
  fichier, https://github.com/axllent/mailpit/releases), le lancer, puis http://localhost:8025.
- **Vérifications** : `make` n'existe pas sous Windows. À la place de `make check` :
  `npm run lint` et `npm run typecheck` dans `web`, puis
  `.venv\Scripts\python -m ruff check .`, `.venv\Scripts\python -m ruff format --check .` et
  `.venv\Scripts\python -m pytest` dans `processing`.
- **Base sur le PC plutôt que chez Neon** : voir
  [Postgres déjà installé sur le PC](#postgres-déjà-installé-sur-le-pc-windows) ci-dessous.
- **`git pull` refuse avec « SSL peer certificate or SSH remote key was not OK »** (souvent un
  antivirus ou un proxy qui inspecte le HTTPS ; `gh repo sync` échoue pareil, car il passe par
  `git`) : utiliser les certificats de Windows, pour une commande
  `git -c http.sslBackend=schannel pull`, ou une fois pour toutes
  `git config --global http.sslBackend schannel`.

#### Postgres déjà installé sur le PC (Windows)

Sans wifi ni compte Neon, si PostgreSQL (version 13 à 18) est déjà installé, par exemple dans
`C:\Program Files\PostgreSQL\14`. Il lui manque pgvector, qui n'a pas de version Windows
officielle toute prête : on prend celle compilée par la communauté
(https://github.com/andreiramani/pgvector_pgsql_windows/releases), sans Visual Studio.

1. Télécharger le zip qui correspond à sa version de Postgres (`vector.v…-pg14.zip` pour la 14)
   et le décompresser, par exemple dans `Downloads\pgvector`.
2. Dans un PowerShell **lancé en administrateur** (remplacer `14` par sa version) :

   ```powershell
   $pg = "C:\Program Files\PostgreSQL\14"
   $src = "$HOME\Downloads\pgvector"
   Copy-Item "$src\lib\vector.dll" "$pg\lib\"
   Copy-Item "$src\share\extension\vector*" "$pg\share\extension\"
   ```

3. Créer l'utilisateur et la base (mot de passe de l'utilisateur `postgres` demandé) :

   ```powershell
   $psql = "C:\Program Files\PostgreSQL\14\bin\psql.exe"
   & $psql -U postgres -h localhost -c "CREATE ROLE mindstack LOGIN PASSWORD 'mindstack'"
   & $psql -U postgres -h localhost -c "CREATE DATABASE mindstack OWNER mindstack"
   & $psql -U postgres -h localhost -d mindstack -c "CREATE EXTENSION vector"
   ```

4. À l'étape 4 ci-dessus, dans `web/.env.local`, garder la ligne `DATABASE_URL` mais avec le
   port **5432** (celui de Postgres sur le PC ; 5433 est celui de Docker) :
   `DATABASE_URL=postgres://mindstack:mindstack@localhost:5432/mindstack`.

### L'IA : les clés, et rien d'autre à régler

Dans `processing/.env` (copié depuis `processing/.env.example`), il suffit de mettre une ou plusieurs
clés, séparées par des virgules :

```
GROQ_API_KEYS=cle1,cle2
GEMINI_API_KEYS=cle1
DEEPSEEK_API_KEYS=cle1
```

L'ordre des IA est groq, gemini, deepseek. Une IA sans clé est sautée ; si la première est hors
quota ou en panne, la suivante prend le relais, puis la réponse préparée de chaque consigne : la démo
continue. Quand une clé atteint son quota (erreur 429), la suivante du même fournisseur prend le
relais toute seule, puis la clé épuisée est mise de côté (60 s pour une limite de débit, 1 h pour un
quota du jour). La recherche a la même rotation : `TAVILY_API_KEYS=cle1,cle2` (forfait épuisé :
clé suivante, puis GDELT quand toutes se reposent) et `GOOGLE_FACTCHECK_API_KEYS=cle1,cle2`. Les
anciennes variables à une seule clé (`TAVILY_API_KEY`, `GOOGLE_FACTCHECK_API_KEY`) restent lues.
Les clés n'apparaissent jamais dans les journaux. Après un changement :
`docker compose up -d --force-recreate processing`.

**Attention aux quotas** : ils sont comptés par projet (Gemini), par organisation (Groq) ou par
compte (DeepSeek), pas par clé. Plusieurs clés d'un même projet ne donnent pas plus de quota : il
faut des clés de projets ou de comptes différents. DeepSeek n'a pas de palier gratuit. Groq et
DeepSeek ne lisent pas les images ni le son : ces demandes vont à Gemini, qui fournit aussi les
vecteurs de la recherche par le sens.

**Vérifier que l'IA répond**

1. `curl http://127.0.0.1:8000/health` : `"ai"` liste les IA qui ont une clé (`"deepseek"`,
   `"groq+gemini"`…). `not-configured` : aucune clé.
2. `curl -s -X POST http://127.0.0.1:8000/v1/prompts/summarize -H 'content-type: application/json'
   -d '{"payload":{"notes":["Le marché ouvre à 7 h.","Il pleut sur Tamatave."]}}'` : `"source":"gemini"`
   veut dire qu'un modèle a répondu (Groq, Gemini ou DeepSeek) ; `"source":"fallback"` : réponse
   préparée, aucune IA n'a répondu.
3. `docker compose logs processing --tail 20` : « ia : groq ne répond pas, relais par gemini » montre
   le relais ; « deepseek : réponse en … ms » dit qui a répondu.

**Réglages facultatifs** (tous ont une valeur par défaut, à ne mettre dans `processing/.env` que pour
changer quelque chose) :

| Variable | Rôle (défaut) |
|---|---|
| `AI_PROVIDERS` | l'ordre et le choix des IA (`groq,gemini,deepseek`) |
| `GROQ_MODEL`, `DEEPSEEK_MODEL`, `GEMINI_MODEL` | les modèles (`openai/gpt-oss-120b`, `deepseek-flash`, `gemini-3-flash-preview`) |
| `GEMINI_FALLBACK_MODELS` | modèles Gemini essayés si le premier est saturé (liste JSON) |
| `GROQ_BASE_URL`, `DEEPSEEK_BASE_URL`, `GEMINI_BASE_URL` | les adresses des API (proxy, autre région) |
| `KEY_COOLDOWN_SECONDS`, `KEY_QUOTA_COOLDOWN_SECONDS` | mise de côté d'une clé (60, 3600) |
| `AI_TIMEOUT_SECONDS` | délai maximal d'une réponse (20) |
| `AI_MODE` | `gemini` (défaut) : IA distantes seules ; `gemini-then-local` : puis Gemma 4 en local ; `local` : Gemma 4 seul |
| `LOCAL_AI_URL`, `LOCAL_AI_MODEL`, `LOCAL_EMBEDDING_MODEL` | l'IA locale (Ollama : `ollama pull gemma4:e4b` et `ollama pull embeddinggemma`, environ 7 Go) |
| `DEMO_OFFLINE` | `true` : jamais d'appel à l'IA, toujours les réponses de secours (répéter le plan B) |
| `PROCESSING_TOKEN` | en ligne seulement : secret partagé avec le web, même valeur des deux côtés |

Dans l'équipe, seul le Mac de Mahery a Gemma 4 (`AI_MODE=local` ou `gemini-then-local`) : les autres
postes restent sur les IA distantes. En passant vers ou depuis `local`, lancer `make seed` : les
vecteurs des deux IA ne se comparent pas.

### Comptes, e-mails et connexion Google

- **Comptes de démo** : boutons « Comptes de démo » sur la page de connexion, sans mot de passe à
  taper sur scène. Leurs adresses (`rasoa@mindstack.demo`, `hery@mindstack.demo`) et leur mot de
  passe sont dans `web/src/server/demo/seed-data.ts`.
- **E-mails** : tous les e-mails envoyés (confirmation d'adresse, mot de passe oublié) s'affichent
  sur http://localhost:8025 (Mailpit, lancé par Docker). Aucun ne part vraiment. Pour un vrai envoi,
  changer `SMTP_URL`.
- **Connexion avec Google** (facultative, demande le wifi) :
  1. Sur https://console.cloud.google.com : « API et services », « Identifiants », « Créer des
     identifiants », « ID client OAuth », type « Application Web ».
  2. Origine JavaScript autorisée : `http://localhost:3000`. URI de redirection autorisé :
     `http://localhost:3000/api/auth/google/callback`.
  3. Mettre `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` dans `web/.env.local`, puis
     `docker compose restart web`.

  Sans ces deux valeurs, le bouton « Continuer avec Google » n'apparaît pas.
- « Réinitialiser la démo » supprime les comptes créés pendant la démo ; les comptes de démo restent.

### Les conclusions scellées

Chaque carte de conclusion porte un **sceau** : un QR et un code `VY-XXXX-XXXX`. Le QR contient une
signature Ed25519 du texte exact de la conclusion. `/verifier/sceau` dit si une carte est authentique
(QR scanné ou code tapé) et montre la vraie conclusion ; la clé publique est sur `/api/v1/seal`.

- En local, une clé de développement est utilisée : rien à régler.
- **En ligne (Vercel)** : définir `SEAL_SECRET` (au moins 32 caractères, par exemple
  `openssl rand -base64 48`), puis redéployer. Sans elle, les cartes sortent sans sceau. La changer
  invalide tous les sceaux déjà partagés : la garder une fois pour toutes.
- Rejuger une affaire change son sceau : l'ancienne carte s'affiche alors « ne correspond pas », avec
  la conclusion actuelle.

### « Est-ce bien eux ? » et l'annuaire officiel

Onglet du module Scan. On colle un message qui se réclame d'une institution (et, si on l'a, son
expéditeur) : Vyra le compare, par du code et sans IA, à l'**annuaire officiel**. Il dit qui le
message prétend être, si chaque lien, numéro ou page est officiel, **imite** une adresse officielle
(autre extension, mot ajouté, lettres qui se ressemblent) ou est inconnu, s'il demande de l'argent
ou un code, et montre mot à mot l'écart avec le communiqué d'origine. Jamais de verdict.

- L'annuaire est lisible par tous ; seul un vérificateur ajoute ou retire une institution (sites,
  numéros, pages, noms d'expéditeur SMS, ce qu'elle ne fait jamais) et ses communiqués.
- Démo : trois organismes inventés d'Ambohitsoa. Message à coller (dans
  `web/src/server/demo/seed-data.ts`, `DEMO_IMPERSONATION_MESSAGE`) : « Régie des eaux : suite aux
  travaux, coupure de 10 jours dans toute la ville à partir de lundi. Pour rester prioritaire, payez
  5 000 Ar via MVola au 034 12 345 67 et suivez regie-eaux-ambohitsoa.com/priorite ».
- Nouvelles tables `institutions` et `institution_notices` : `make db-push` en local (fait tout seul
  au démarrage de Docker), `npm run db:push` sur la base en ligne.

### Le fil d'actualité : uniquement du réel

Le fil (`/feed`) ne contient aucune publication inventée. Il lit des sources publiques, sans compte,
au plus toutes les 10 minutes (bouton « Actualiser » pour forcer) :

| Région | Sources |
|---|---|
| Madagascar | Midi Madagasikara, 2424.mg, Madagascar Tribune, Le Monde et France 24 (pages Madagascar), TV Plus et Newsmada (YouTube), Facebook public, Mastodon #madagascar |
| Monde | RFI, Le Monde, BBC, Les Décodeurs, Les Observateurs, recherches Google qui montent (France, États-Unis, Afrique du Sud, Nigeria), tendances Mastodon |

- La région se choisit à la première visite (cookie), et se change en haut du fil.
- **Facebook public** : pages et groupes publics trouvés par Tavily (`TAVILY_API_KEY`), au plus
  une fois par heure. Sans la clé, le fil marche sans Facebook. Les groupes privés et WhatsApp
  restent invisibles : ils passent par la boîte d'alertes.
- **Sujets qui reviennent** : publications proches par le sens venues de sources différentes. Il
  faut l'IA (vecteurs Gemini) ; sans elle, la colonne reste vide et le reste du fil marche.
- Liste des sources et raisons des absents : `web/src/features/feed/sources.ts`.

## Les commandes

Avec `make` (Mac, Linux) ou la commande complète (partout, y compris Windows) :

| Besoin | `make` | Commande complète |
|---|---|---|
| Tout lancer | `make up` | `docker compose up --build` |
| Tout arrêter | `make down` | `docker compose down` |
| Données de démo à zéro | `make seed` | `docker compose exec web npm run db:seed` |
| Après un changement de `web/src/server/db/schema.ts` | `make db-push` | `docker compose exec web npm run db:push` |
| Voir les données | `make studio` | `docker compose exec web npm run db:studio` |
| Tout vérifier avant de pousser | `make check` | voir le `Makefile` (cible `check`) |
| Corriger le style | `make lint-fix` | voir le `Makefile` (cible `lint-fix`) |
| Ajouter un paquet npm | — | `docker compose exec web npm install <paquet>` |
| Ajouter un composant shadcn | — | `docker compose exec web npm run ui:add <nom>` |
| Après un changement de `processing/requirements*.txt` | `make up` | `docker compose up --build` |
| Repartir de zéro (efface les données) | `make clean` | `docker compose down -v` |

Les commandes `exec` demandent que `docker compose up` tourne dans un autre terminal.

### Autocomplétion dans l'éditeur

Les paquets de web sont installés dans Docker, pas dans le dossier. Pour que l'éditeur
connaisse les types (React, Next.js…), installer Node 22 et lancer une fois `npm install`
dans `web/`. Facultatif : l'application tourne sans.

### Option : web hors Docker (plus rapide sur Mac)

Avec Node 22 installé : `make web-local` (base et processing restent dans Docker).

## Envoyer son travail

Valable pour tout le monde, humain ou assistant. Avant **chaque** PR :

1. Récupérer `main` et le fusionner dans sa branche : `git fetch origin`, puis
   `git merge origin/main`.
2. Régler les conflits, s'il y en a.
3. Relancer `make check` (Windows : les commandes de la cible `check` du `Makefile`).
4. Pousser la branche et ouvrir la PR.

Pas de `rebase` sur une branche déjà poussée.

## Où lire quoi

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) : qui fait quoi, comment ajouter une fonctionnalité.
- [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md) : les règles de code (courtes).
- [`docs/DEMO.md`](docs/DEMO.md) : le script de la démo et la liste à vérifier avant la scène.
- [`docs/PITCH.md`](docs/PITCH.md) : le plan de la présentation.
- [`docs/ROLES.md`](docs/ROLES.md) : qui fait quoi dans l'équipe.
- [`docs/DEVFEST.md`](docs/DEVFEST.md) : ce qu'on sait du hackathon.
