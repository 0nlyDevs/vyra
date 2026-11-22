# La démo en direct

Le pitch dure cinq minutes au total. Son parcours principal ci-dessous occupe **2 min 30** : une rumeur devient une affaire, elle est jugée, la conclusion est signée. Les autres séquences sont des variantes pour la répétition ou les questions. Sans internet, utiliser Docker local déjà préparé ; le fil neuf, les recherches web et la recherche sémantique ne sont pas garantis.

Comptes de démo (mot de passe `vyra-demo`) : `rasoa@vyra.demo` (Vérificateur),
`hery@vyra.demo` (Citoyen). En ligne : https://vyra-mg.vercel.app. En local :
http://localhost:3000.

## Les données de démo

`make seed` (ou le bouton « Réinitialiser la démo ») recrée un jeu cohérent :

| | Contenu |
|---|---|
| Affaires | 22 : 18 jugées (Établi ×3, Probable, Incertain, Contredit ×11, Informations insuffisantes ×2) et 4 ouvertes à juger en direct (*La photo de l'inondation*, *Le recrutement à 500 postes*, *Le réseau mobile coupé trois jours*, *La bourse d'études*). 13 affaires sont inventées ; **9 sont réelles**, à Madagascar (Covid-Organics, la peste) et dans le monde (5G, micropuces, canular du pape, alunissages Apollo, eau de Javel, Ebola) |
| Dossiers | 47 versions, 25 liens (ton durci, chiffre changé, reprise à l'identique…), 65 pièces, 18 audiences avec plaidoiries, constats et conclusion |
| Autour | 8 signalements en 3 groupes, 5 scénarios du jeu, 3 institutions et leurs communiqués |
| Comptes | `rasoa@vyra.demo` (Vérificateur), `hery@vyra.demo` (Citoyen) ; mot de passe `vyra-demo` |

Les données sont dans `web/src/server/demo/` : `seed-data.ts` (le socle), `seed-archive.ts` (les dossiers
inventés) et `seed-world.ts` (les affaires réelles : positions publiques d'institutions résumées, sans
citation ni lien, à relire avant toute diffusion). Les vecteurs de la recherche par le sens sont calculés au premier besoin.

## Le parcours principal : 2 min 30

| Durée cible | Écran | Ce qu’on fait | Ce que ça montre |
|---|---|---|---|
| 10 s | Fil d'actualité `/feed` | Ouvrir le fil : la une, les histoires, « sujets qui reviennent » | Ce qui circule, avec l'état de chaque publication. « Non vérifié ne veut pas dire faux » |
| 25 s | Enquêtes → *La photo de l'inondation* | Ouvrir l'affaire, montrer l'arbre des versions | La même image a changé de légende de version en version |
| 25 s | Scan `/scan` | Déposer `web/public/demo/inondation-virale.jpg`, puis `image-generee.png` | La photo virale n'a plus d'informations cachées (« rien à en conclure ») ; l'image générée déclare son outil. Jamais de verdict |
| 70 s | Tribunal `/court/…` | Lancer l'audience, voter | Deux IA plaident, le juré vote, les pièces déterminent **Contredit** et l’IA en explique la raison |
| 20 s | Carte de conclusion → `/verifier/sceau` | Scanner le QR ou taper le code | La carte est authentique : la conclusion est signée |

## Séquences optionnelles

| # | Écran | Ce qu’on fait | Ce que ça montre |
|---|---|---|---|
| 6 | *What If ?* | « Voir la version calme » | La même information dite sans alarme |
| 7 | Assistant | « Que sais-tu sur la photo de l'inondation ? » | Il cite l'affaire jugée au lieu d'inventer |
| 8 | Extension (panneau latéral) | Sélectionner un texte sur une page, clic droit → *Vérifier ce texte* | La vérification là où on lit, sans compte |
| 9 | Application mobile | Fil, Enquêtes, Scan, Alertes, Compte, puis assistant flottant | Le même serveur et les mêmes dossiers ; les nouvelles fonctions vocales et sources web de l’assistant restent à intégrer au client mobile |
| 10 | Flash radio `/verifier/flash` | Ouvrir la page | De la conclusion au texte lu à l'antenne |

Autres variantes à répéter si elles sont présentées :

- Assistant : « Redirige-moi vers la page enquête » ouvre directement `/cases`. Activer Voix,
  autoriser le micro, poser une question puis attendre la reprise automatique de l’écoute.
- Assistant : « Cherche des sources sur la peste à Madagascar » montre les liens et les dates
  disponibles. Sans recherche réelle, montrer le message d’indisponibilité.
- Tribunal : « Poutine et Donald Trump », ou « Trump », peut retrouver le dossier du pape et de
  Trump par les vecteurs. Le résultat est un sujet proche, pas un verdict sur Poutine.
- Jeu : les cartes 2D sont la solution de secours sans WebGL ou sur téléphone ; la rue 3D et ses
  panneaux se vérifient aussi à la résolution du projecteur.

Les fichiers de démo (image, vocal, vidéo) sont dans `web/public/demo/`. Le vocal
(`vocal-coupure-eau.wav`) et la vidéo (`video-coupure-eau.mp4`) se déposent dans le même écran Scan.

## Avant de monter sur scène

1. En ligne : ouvrir `https://vyra-mg.vercel.app` et `https://vyra-processing.onrender.com/health`
   pour **réveiller** les services (le premier appel peut prendre quelques secondes).
2. En local : `docker compose up --build`, puis `make seed` (ou le bouton « Réinitialiser la démo »
   du Vérificateur) pour des données propres.
3. Vérifier `/health` de processing : la liste `ai` décrit les fournisseurs configurés, elle ne prouve pas que les clés fonctionnent. Essayer réellement une question, un embedding et la dictée ; vérifier `audio` pour la dictée et `video` avant de montrer une vidéo. Ne pas afficher les clés.
4. Jouer le script une fois en entier. Le tribunal ne doit pas déjà être conclu : la démo se
   réinitialise avec le bouton du Vérificateur.
5. Navigateur en plein écran, zoom vérifié au projecteur, notifications coupées, chargeur branché.
6. Enregistrer réellement une vidéo de secours puis vérifier sa lecture : ce fichier n’est pas fourni par le dépôt.
7. Réserver le seed à une base de démonstration : il efface les comptes, sessions et affaires avant de les recréer. Ne pas le lancer sur des données à conserver.
8. Le kit `/kit` n’est pas une étape de la démo et n’est pas disponible en production.

## Les plans de secours

- **Le wifi tombe** : basculer d’abord sur le serveur Docker local déjà préparé. Les réponses de l'IA viennent de `processing/app/fallbacks/`. À répéter avant
  avec `DEMO_OFFLINE=true` dans `processing/.env`, puis `docker compose restart processing`. Ce réglage désactive les IA et les moteurs de recherche ; il ne simule pas à lui seul la coupure de toutes les routes réseau. Si le fil est vide hors ligne, commencer par le dossier déjà préparé.
- **Un fournisseur d'IA atteint son quota** : la chaîne passe au suivant toute seule (Groq, Gemini,
  DeepSeek) ; plusieurs clés par fournisseur tournent.
- **Le site en ligne est lent** : basculer sur la version locale (même données de démo).
- **Le PC plante** : la vidéo de la démo, enregistrée à l'avance.
- **Une donnée a été abîmée en répétition** : bouton « Réinitialiser la démo », en local seulement
  (il efface tous les comptes, il n'existe donc pas sur le site en ligne).
