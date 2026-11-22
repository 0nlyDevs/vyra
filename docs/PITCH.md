# La présentation

**5 minutes** de présentation, puis **3 minutes** de questions (règlement du hackathon). Le jury
note le pitch et la démonstration en direct sur 25 points : clarté, maîtrise de la démo, réponses.

## Le plan (5 minutes)

| Partie | Durée | Contenu |
|---|---|---|
| Le problème | 40 s | Une ancienne photo d’inondation republiée avec un lieu, une date et un bilan inventés |
| L'idée | 30 s | Vyra ne dit pas quoi croire : un tribunal examine, une conclusion est signée |
| La démo en direct | 2 min 30 | Le script de [DEMO.md](DEMO.md) : fil → affaire → scan → tribunal → sceau |
| L'IA, et ses limites | 40 s | L’IA rédige (pointillés), les pièces déterminent le niveau ; le sceau authentifie la carte |
| La technique | 30 s | Le schéma de [ARCHITECTURE.md](ARCHITECTURE.md) : site, IA, base, extension, mobile |
| Pour qui, et la suite | 10 s | Rédactions, radios locales, citoyens ; plus de langues |

## Les règles

- Une personne parle, une autre clique.
- Commencer par le problème, jamais par la technique.
- Répéter au moins deux fois en entier, chronomètre en main.

## Questions probables du jury

- **Que se passe-t-il sans internet ?** Nous basculons sur Docker local déjà installé et préparé. Les dossiers et le flash radio restent lisibles ; les réponses IA préparées prennent le relais. Les recherches web et la recherche thématique vectorielle sont indisponibles sans leur service. Le site hébergé ne fonctionne pas magiquement hors ligne.
- **L'IA peut se tromper : pourquoi lui faire confiance ?** On ne le demande pas : elle ne conclut
  jamais seule. Ses lectures sont en pointillés ; le niveau est calculé par une règle fixe sur les pièces solides, le vote est enregistré et l’IA explique le résultat. Ainsi,
  « informations insuffisantes » est une conclusion normale.
- **Comment protégez-vous les données des personnes ?** Une image n'est lue par l'IA qu'en copie
  protégée (visages floutés, informations cachées retirées) ; limites de débit, rôles vérifiés côté
  serveur, jeton entre le site et le service d'IA, sceau signé.
- **Qu'est-ce qui est vraiment fait, et qu'est-ce qui est simulé ?** Réel : fil, enquêtes, scan,
  tribunal, sceau, assistant, extension, mobile. Données de démo : les affaires et les comptes. Pas
  encore : traduction complète en malgache. Les vérifications de tiers et la recherche web sont implémentées, mais leur disponibilité dépend du réseau et des clés ; montrer les liens réellement reçus. Le mobile a un périmètre plus restreint que l’API.
- **Comment passer à grande échelle ?** Le site et processing sont séparés, les données restent dans Postgres. Les limites de débit et la rotation des clés existent ; il reste à mesurer la charge, dimensionner la base et choisir des offres adaptées. Aucun test de charge ne justifie une promesse de capacité aujourd’hui.
- **Quelle différence avec un site de fact-checking ?** Vyra ne publie pas de verdicts de
  journalistes : il montre le raisonnement, les pièces et le niveau de certitude, et il se
  glisse là où l'information circule (extension, mobile).

- **Le vote choisit-il la vérité ?** Non. `computeCertainty` examine les pièces solides : contradiction,
  concordance ou insuffisance. Le vote accompagne l’audience et ne remplace pas ces critères.
- **Que prouve le sceau ?** Que le contenu signé correspond à une conclusion de Vyra et n’a pas
  été modifié ; il ne garantit pas la véracité des faits ni l’exhaustivité du dossier.
- **Pourquoi ces technologies ?** Next.js porte le métier et les clients, Python les médias et l’IA,
  Postgres + pgvector les données et la recherche sémantique. Montrer les compromis dans
  [ARCHITECTURE.md](ARCHITECTURE.md), pas une liste de logos.
