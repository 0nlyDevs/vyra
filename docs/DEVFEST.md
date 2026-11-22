# Modalités du hackathon et réponse de Vyra

Synthèse des modalités fournies dans les photos du dossier `subject`, relues le 22 novembre 2026.
Elles montrent le sujet **1.3 Fight the misinformation**, les objectifs, le format et le barème.
Le règlement complet des organisateurs fait foi ; ces extraits ne permettent pas de confirmer
les horaires précis ni les formalités de remise qui n’y figurent pas.

## Ce qui est demandé

- Concevoir une solution numérique innovante (web, mobile, cloud, IA), avec une valeur d’usage réelle,
  une architecture cohérente et un prototype fonctionnel.
- Aider à identifier les fausses informations, les images manipulées et les contenus générés par IA.
  Vérifier les sources et faciliter le fact-checking, y compris pour les personnes peu familières du
  numérique et les communautés locales.
- Équipes de 2 à 5 membres ; durée annoncée : 24 heures ; outils d’IA autorisés et encouragés.
- Livrer le code source complet sur un dépôt public avec un README d’installation, le prototype
  fonctionnel et la documentation.
- Pitch : 5 minutes de présentation, puis 3 minutes de questions.

Les anciennes mentions « samedi à 8 h → dimanche à midi = 24 h » sont retirées : elles additionnaient
28 heures et n’étaient pas justifiées par les photos fournies. Le programme de l’organisateur est à
consulter pour les heures de passage, le lieu et la date limite de dépôt.

## Barème : 100 points

| Critère des modalités | Points | Preuve dans Vyra | Limite à expliquer au jury |
|---|---|---|---|
| Innovation et pertinence par rapport au thème | 25 | Affaire, arbre des versions, tribunal, sceau, extension et mobile ; [README](../README.md), [DEMO](DEMO.md) | Une IA ne prouve pas qu’une information est vraie ; aucune lecture des groupes privés |
| Qualité technique, architecture, maintenabilité et sécurité | 25 | [Architecture et choix technologiques](ARCHITECTURE.md), contrats Zod/Pydantic, DAL, migrations, tests et CI | Quotas et services distants ; prototype, sans certification de sécurité ni de détection universelle |
| Compréhension et documentation | 25 | [Index](README.md), installation, rôles, [API](API-MOBILE.md), décisions et compromis dans [ARCHITECTURE](ARCHITECTURE.md) | Distinguer le code local, l’API, le client mobile et la version effectivement déployée |
| Pitch et démonstration en direct | 25 | [PITCH](PITCH.md), séquence de 2 min 30 dans [DEMO](DEMO.md), questions et plans de secours | Répéter au chronomètre ; préparer réellement la vidéo de secours |

## Livrables et contrôle avant remise

- **Code public** : dépôt principal [0nlyDevs/vyra](https://github.com/0nlyDevs/vyra), confirmé public
  au moment de cet audit. Le client mobile est un dépôt séparé : joindre aussi son lien si présenté.
- **Installation reproductible** : une commande Docker, ou la procédure sans Docker du README.
- **Documentation** : versions dans les manifestes, justifications et limites dans l’architecture,
  description du modèle de certitude et de la signature, périmètre réel des clients.
- **Prototype** : essayer le parcours de la démo sur le serveur choisi. La présence d’une fonction
  dans le dépôt ne certifie pas sa disponibilité sur Render/Vercel ni la validité des clés.
- **Présentation** : aucun besoin de montrer `/kit`. C’est un outil de développement, pas un module
  destiné au public. Montrer les preuves et le raisonnement, puis répondre aux questions.
