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

### L'IA : plusieurs fournisseurs, plusieurs clés, un ordre

Tout se règle dans `processing/.env` (copié depuis `processing/.env.example`).

**L'ordre des fournisseurs** : `AI_PROVIDERS=groq,gemini,deepseek` (c'est l'ordre par défaut). La
première IA répond ; si elle n'a pas de clé, a atteint son quota ou tombe en panne, la suivante
prend le relais. Une IA sans clé est sautée.

**Les clés** : une ou plusieurs par fournisseur, séparées par des virgules.

```
GROQ_API_KEYS=cle1,cle2,cle3
GEMINI_API_KEYS=cle1,cle2
DEEPSEEK_API_KEYS=cle1
```

Quand une clé atteint son quota (erreur 429), la suivante prend le relais toute seule, sans couper
la demande en cours. La clé épuisée est mise de côté 60 secondes (limite de débit), ou 1 heure
(quota du jour, solde épuisé, clé refusée), puis elle revient. Quand toutes les clés d'un
fournisseur sont épuisées, on passe au fournisseur suivant. Les clés n'apparaissent jamais dans
les journaux. (`GEMINI_API_KEY`, une seule clé, marche toujours.)

Groq et DeepSeek ne lisent pas les images ni le son : ces demandes (scan) vont à Gemini. Les
vecteurs de la recherche par le sens viennent aussi de Gemini, avec rotation de ses clés.

**Le local** : `AI_MODE` décide de Gemma 4.

| `AI_MODE` | Qui répond | À installer |
|---|---|---|
| `gemini` (par défaut) | Les IA distantes seules, dans l'ordre | Au moins une clé (Gemini : gratuite sur https://aistudio.google.com/apikey) |
| `gemini-then-local` | Les IA distantes, puis Gemma 4 en local si aucune ne répond | Les clés, plus [Ollama](https://ollama.com) avec `ollama pull gemma4:e4b` et `ollama pull embeddinggemma` (environ 7 Go, 16 Go de mémoire conseillés) |
| `local` | Gemma 4 en local seul, sans wifi | Ollama et les deux modèles |

Dans l'équipe, seul le Mac de Mahery a Gemma 4 (modes `local` et `gemini-then-local`) : tous les
autres postes restent en `gemini` et n'installent ni Ollama ni Gemma.

Dans tous les cas, si aucune IA ne répond, la réponse préparée de chaque consigne s'affiche : la
démo continue.

Après un changement de `processing/.env` : `docker compose up -d --force-recreate processing`.
Vérifier : http://127.0.0.1:8000/health affiche les IA qui ont une clé, dans l'ordre
(`"ai": "groq+gemini"`), ou le mode (`gemini-then-local`, `local`).
En passant vers ou depuis `local`, lancer aussi `make seed` : les vecteurs des deux IA ne se
comparent pas.

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
