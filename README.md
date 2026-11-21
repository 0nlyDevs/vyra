# MindStack · DevFest Antananarivo 2026

Projet de l'équipe **MindStack** au hackathon du DevFest Antananarivo (21 et 22 novembre 2026).
Tout tourne en local sur un PC : le jury juge la **démo en direct** et la présentation.

## Démarrer : une seule commande, sur Mac, Linux et Windows

Prérequis : **Git** et **Docker** (Docker Desktop sur Mac et Windows). Rien d'autre : Node,
Python et Postgres tournent dans Docker.

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

### L'IA : Gemini pour développer, Gemma 4 en local pour la démo

Deux façons de faire répondre l'IA, avec les mêmes consignes. On choisit dans `processing/.env`
(copié depuis `processing/.env.example`), puis `docker compose restart processing`.

| | Gemini (par défaut) | Modèle local (démo) |
|---|---|---|
| Réglage | `AI_PROVIDER=gemini` | `AI_PROVIDER=local` |
| À installer | Rien : une clé gratuite sur https://aistudio.google.com/apikey dans `GEMINI_API_KEY` | [Ollama](https://ollama.com), puis `ollama pull gemma4:e4b` et `ollama pull embeddinggemma` (environ 10 Go) |
| Wifi | Nécessaire | Inutile |
| Pour qui | Toute l'équipe pendant le développement | Le PC de la démo (16 Go de mémoire conseillés) |

Sans IA (pas de clé, wifi coupé, Ollama arrêté), l'application marche avec les réponses de
secours. Vérifier : http://127.0.0.1:8000/health affiche `"ai": "gemini"` ou `"ai": "local"`.
Après un changement d'IA, lancer `make seed` : les vecteurs des deux IA ne se comparent pas.

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
