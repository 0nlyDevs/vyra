# Architecture

Vyra tient en quatre morceaux : le **site** (Next.js), le service d'**IA et de calcul**
(`processing/`, FastAPI), la **base** (Postgres + pgvector) et deux **clients** légers, l'extension
du navigateur et l'application mobile, qui parlent au même site.

## Vue d'ensemble

```
 Navigateur ──────┐
 Application      │  HTTPS            ┌────────────────────────────────────────────┐
 mobile (Expo) ───┼─ Bearer ────────▶ │ web/  Next.js 16 (Vercel, ou Docker en local)│
 Extension ───────┘  /api/v1, /api/check│  • pages, server actions, routes /api       │
 (panneau latéral)                      │  • sessions, rôles, limites de débit       │
                                        │  • SEUL accès à la base ───────────────────┼─▶ Postgres + pgvector
                                        └───────────────┬────────────────────────────┘    (Neon en ligne,
                                                        │ HTTP + PROCESSING_TOKEN          Docker en local)
                                                        │ (src/server/processing.ts seul)
                                        ┌───────────────▼────────────────────────────┐
                                        │ processing/  FastAPI (Render, ou Docker)   │
                                        │  • prompts d'IA (app/prompts/*.md)         │──▶ Groq → Gemini → DeepSeek
                                        │  • vecteurs (recherche par le sens)        │    (rotation de clés)
                                        │  • examen de médias : métadonnées, copie   │──▶ ElevenLabs (voix),
                                        │    protégée, vidéo (ffmpeg), voix           │    Groq Whisper (dictée)
                                        │  • lecture de pages, fil, vérifications    │──▶ Tavily, Google Fact Check
                                        │  • réponses de secours sans IA             │
                                        └────────────────────────────────────────────┘
```

## Qui possède quoi

| | `web/` (Next.js) | `processing/` (FastAPI) |
|---|---|---|
| Rôle | Interface, logique métier, droits | IA et calculs en Python |
| Appelé par | Navigateur, mobile, extension | Uniquement `web/src/server/processing.ts` |
| Base de données | **Seul propriétaire** (Drizzle, migrations versionnées) | Aucun accès |
| Utilisateurs | Comptes e-mail ou Google, sessions, rôles | Ne les connaît pas |
| Secrets | `web/.env` : base, `PROCESSING_TOKEN`, `SEAL_SECRET`, SMTP, Google | `processing/.env` : clés des IA, `PROCESSING_TOKEN` |
| Hébergement | Vercel (`vercel-build` applique les migrations) | Render (`render.yaml`) |

## Les trois façons d'entrer

| Client | Où | Comment il parle au site |
|---|---|---|
| Site | `web/` | Server actions et pages |
| Application mobile | dépôt `vyra-mobile` (Expo) | `/api/v1/*` avec un jeton `Bearer` ([API-MOBILE.md](API-MOBILE.md)) |
| Extension | `extension/` | Route **publique** `POST /api/check` (texte ou lien) et `POST /api/check/image`, sans compte, limitées par adresse |

Le site expose donc deux surfaces d'API : `/api/v1` (avec compte, CORS réglé par `next.config.ts`)
et `/api/check*` (sans compte, pensée pour l'extension : jamais de verdict nouveau, rien de gardé).

## Ce qui est jugé par qui

C'est le cœur de la confiance : **aucune IA ne conclut seule.**

1. **Le code lit le message** sans IA (`features/signals`) : ton (urgence, appel à partager,
   capitales), danger (accusation, panique, faux ordre officiel). Les mots sont cités tels quels.
2. **L'IA propose** : lecture d'une image, plaidoiries du tribunal, version « calme » de What If.
   Ses lectures s'affichent en **pointillés** à côté des faits ; le mode *Sans IA* ne garde que les
   faits.
3. **Le tribunal conclut** avec un niveau de certitude, après le vote du public.
4. **Un sceau signé** (HMAC, `SEAL_SECRET`) prouve qu'une carte de conclusion est authentique.

Sans IA ni réseau, tout continue : réponses de secours (`processing/app/fallbacks/`), recherche par
mots, flash radio écrit sans IA.

## Sécurité

| Risque | Mesure |
|---|---|
| Accès aux données d'autrui | Rôles vérifiés côté serveur à chaque action (`isVerifier`), jamais côté client |
| Abus des routes publiques | Limites par adresse en base (`server/rate-limit.ts`) : connexion, signalements (10/jour), vérifications (60/h), examens d'image (30/h) |
| Lecture de pages vers une adresse interne (SSRF) | `processing/app/services/safe_url.py` refuse les adresses privées |
| Image personnelle envoyée à une IA | Copie protégée : visages floutés, informations cachées retirées ; l'original ne part nulle part |
| Appels directs à processing | `PROCESSING_TOKEN` partagé (sans lui : 401) |
| Fausse conclusion | Sceau signé, vérifiable sans compte (`/verifier/sceau`) |
| Navigateur | `X-Frame-Options`, `nosniff`, `Referrer-Policy`, CORS limité à `/api/v1` |
| Secrets | Jamais dans le dépôt : `.env` ignorés, `*.env.example` documentés ; clés d'IA en rotation (plusieurs par fournisseur) |
| Extension | Aucun script injecté, aucune lecture de page ; un site n'est lu qu'avec l'accord de la personne |

## Recherche par le sens (pgvector)

Les affaires, les publications du fil et les infos retrouvées sont transformées en vecteurs par
`processing/`. La base cherche le plus proche (`cosineDistance`) ; si rien n'est assez proche, ou sans
IA, la recherche repasse par les mots. Les « sujets qui reviennent » sont des paires de publications
proches venues de sources différentes (`features/feed/topics.ts`).

**L'assistant fonctionne en RAG** (`features/assistant`) : la question est transformée en vecteur,
la base renvoie les affaires les plus proches (`listNearestCasesForAssistant`), complétées par les
plus récentes (`pickAssistantCases`), et l'IA ne répond qu'à partir de ces affaires, qu'elle cite
par numéro. Une citation qui ne correspond à aucune affaire fournie est écartée.

## L'arborescence

```
web/src/app           pages et routes API (app/api/v1, app/api/check)
web/src/features      une fonctionnalité par dossier (actions, composants, schéma, tests)
web/src/server        accès base (dal/), processing, session, limites, démo
web/src/lib           valeurs du domaine (domain.ts), formats, erreurs
web/drizzle           migrations SQL versionnées
processing/app        routers/, services/, prompts/, fallbacks/, core/
processing/tests      tests pytest (rotation des clés, voix, médias, prompts…)
extension/            panneau latéral Manifest V3 (JS sans build), scénarios de test
docs/                 ce dossier
```

## Ajouter une fonctionnalité

1. Un dossier `web/src/features/<nom>/` : `schema.ts` (Zod), `actions.ts`, composants.
2. Dans l'action, toujours dans cet ordre : **connexion → validation → droits → DAL**.
3. Une valeur du domaine (liste, libellé) se déclare dans `lib/domain.ts`, jamais en dur.
4. Une table de plus : modifier `server/db/schema.ts`, puis `npm run db:generate` et committer
   `web/drizzle/` (la CI refuse sinon).
5. De la logique pure : un `*.test.ts` à côté, `npm test`.

## Ajouter un appel à l'IA

Un prompt dans `processing/app/prompts/<nom>.md`, sa réponse de secours dans
`processing/app/fallbacks/<nom>.json`, puis un appel depuis `web/src/server/processing.ts`
(`runPrompt`). L'ordre des fournisseurs et la rotation des clés sont réglés par variables
(`processing/.env.example`) : un fournisseur à bout de quota passe la main au suivant.

## Choix techniques

| Choix | Raison |
|---|---|
| Next.js + FastAPI | Interface et logique en TypeScript ; l'IA et le traitement de médias en Python |
| Un seul propriétaire de la base | Les droits se vérifient à un seul endroit |
| Postgres + pgvector | Recherche par le sens, sans service de plus |
| Chaîne de fournisseurs avec rotation de clés | Les quotas gratuits sont l'obstacle réel ; une panne ne coupe pas le service |
| Réponses de secours | Le réseau de la salle est le plus grand risque d'une démo |
| Migrations Drizzle appliquées au déploiement | Une base en ligne ne se met pas à jour à la main |
| Extension en JS sans build | Rien à installer pour la relire |
| Docker Compose | Une commande sur Mac, Linux et Windows |
