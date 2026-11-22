# Contrôle de cohérence documentaire — 22 novembre 2026

## Périmètre et méthode

Relecture du README principal, des documents `docs/`, des instructions de contribution, du
README de l’extension, du guide des prompts et du README mobile. Après récupération des derniers commits, le mobile a été relu sur `origin/main` (`2548e7e`) dans un checkout isolé : il contient bien les scans, les alertes, les sceaux et les outils d’enquête.
Les prompts métier et les crédits locaux ont été consultés ; leurs sources externes et chaque
affirmation des neuf dossiers réels n’ont pas été revérifiées sur internet.

Comparaison avec les manifestes, les commandes, les configurations de runtime, les routes API,
la DAL, les règles de certitude, le sceau, le seed et les écrans présents. Les modalités sont les
cinq photos distinctes du dossier `subject` : sujet 1.3, suite sur l’accessibilité, objectifs,
format/barème et pitch. `webcup-11oct-2.jpg` reprend la photo du sujet et ne définit pas une
nouvelle règle. Le dépôt principal a été confirmé public via les métadonnées GitHub.

## Écarts corrigés

| Point | Correction et référence vérifiable |
|---|---|
| Kit montré aux utilisateurs | Liens retirés de la coquille ; `/kit` autorisé seulement en développement. Catalogue conservé pour l’équipe |
| Ancienne barre latérale, trois affaires de démo | Documentation alignée sur les onglets, 22 affaires et les fichiers `seed-data`, `seed-archive`, `seed-world` |
| Sceau présenté comme HMAC | Ed25519, conforme à `web/src/server/seal.ts` ; authenticité de la carte distincte de la vérité de l’information |
| Vote présenté comme arbitre du niveau | `computeCertainty` calcule sur les pièces solides ; le vote est enregistré et l’IA explique le niveau |
| Assistant décrit comme limité aux affaires jugées | Sources du web, Wikipédia, vérificateurs ; citations, dates, indisponibilité et secours documentés |
| Voix décrite comme un simple bouton de dictée | Boucle continue du site, arrêt du micro, retour au clavier et limitations du client mobile explicités |
| Recherche du tribunal assimilée à une correspondance exacte | Plusieurs sujets vectorisés, classement pgvector, résultats thématiques multiples ; aucun repli textuel sur ce parcours |
| API et écrans mobiles confondus | Contrat `/assistant` actualisé, `signals` du scan de lien ajouté, routes disponibles distinguées de leur prise en charge par le mobile mis à jour |
| Fonctionnement hors ligne universel | Version Docker préparée requise sans internet ; pas d’accès au site hébergé ni de nouvelles recherches distantes |
| Règles et démo contradictoires | 24 heures sans horaires non attestés ; pitch de 5 minutes comprenant 2 min 30 de démo, compléments optionnels |
| Choix techniques énumérés sans compromis | Tableau de justification et de limites dans `ARCHITECTURE.md`, versions renvoyées aux manifestes |
| Commandes et configuration obsolètes | Lien vers l’IA, table des commandes, tests web, migration/pgvector, Resend/MAIL_FROM et distinction Docker/hors Docker corrigés |
| Crédits incomplets | Index des crédits d’accueil public, connexion, accueil connecté, jeu, polices et icônes |

La passe avant envoi intègre également `main` jusqu’à `b63450c` : nouvelles règles de mots de passe, limites par e-mail normalisé et renforcement scrypt à la connexion. Les documents de comptes et le contrat d’inscription ont été alignés sur ces changements.

## Contrôles effectués sur les sources

- Liens locaux des 16 documents de navigation et de contribution : aucun lien de fichier cassé.
- Contrat mobile : les 35 méthodes HTTP exportées sous `/api/v1` disposent d’une entrée documentaire.
- Comptages du seed recalculés sans toucher la base : 22 affaires, 18 conclues, 47 versions,
  25 liens, 65 pièces, 18 audiences, 5 scénarios, 3 institutions, 8 signalements en 3 groupes,
  2 comptes et 9 exemples réels. Ces comptes décrivent le seed, pas l’état d’une base distante.
- Contrôles de types, tests et lint web exécutés ; les avertissements CSS déjà présents restent.
  Le README mobile seul est modifié sur sa branche documentaire issue de `2548e7e`. Après installation des dépendances verrouillées dans le checkout isolé, ses types, tests et lint sont validés ; le checkout de travail et ses modifications préexistantes sont conservés.
- Commentaires Python modifiés : contrôle et format Ruff validés.

## Vérifications qui restent distinctes de la documentation

Les contrôles de types, de style et les tests peuvent vérifier le code ; ils ne valident pas
les services externes ni le sens d’un classement réel d’embeddings. Dans cet environnement,
Docker et Chromium sont bloqués : pas de validation visuelle, de vrai micro ni d’essai de la
requête vectorielle contre Postgres. Vérifier « Poutine et Donald Trump » sur la base de démo
avec le modèle d’embeddings utilisé, et ajuster le seuil si les résultats sont trop larges.

Avant remise : valider les déploiements, les clés de recherche/IA/voix, la présence de ffmpeg,
le parcours sur projecteur et téléphone, le lien du client mobile présenté, ainsi que la vidéo
de secours réellement enregistrée. La documentation ne déclare pas ces contrôles réussis.

Les modifications locales ne sont pas automatiquement déployées. Le checkout mobile voisin
avait déjà des modifications d’`app.json` et du lockfile ; elles ne font pas partie de cet audit.

La passe finale inclut également les README extension/prompts et les modèles d’environnement ; les licences et attributions originales sont conservées.
