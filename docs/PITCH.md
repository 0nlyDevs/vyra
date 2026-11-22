# La présentation

**5 minutes** de présentation, puis **3 minutes** de questions (règlement du hackathon). Le jury
note le pitch et la démonstration en direct sur 25 points : clarté, maîtrise de la démo, réponses.

## Le plan (5 minutes)

| Partie | Durée | Contenu |
|---|---|---|
| Le problème | 40 s | Une fausse photo d'inondation partagée mille fois avant que personne ne vérifie |
| L'idée | 30 s | Vyra ne dit pas quoi croire : un tribunal examine, une conclusion est signée |
| La démo en direct | 2 min 30 | Le script de [DEMO.md](DEMO.md) : fil → affaire → scan → tribunal → sceau |
| L'IA, et ses limites | 40 s | L'IA propose (pointillés), le tribunal conclut ; « Sans IA » ne garde que les faits |
| La technique | 30 s | Le schéma de [ARCHITECTURE.md](ARCHITECTURE.md) : site, IA, base, extension, mobile |
| Pour qui, et la suite | 10 s | Rédactions, radios locales, citoyens ; plus de langues |

## Les règles

- Une personne parle, une autre clique.
- Commencer par le problème, jamais par la technique.
- Répéter au moins deux fois en entier, chronomètre en main.

## Questions probables du jury

- **Que se passe-t-il sans internet ?** Les réponses de secours prennent le relais ; la recherche
  repasse par mots ; le flash radio est écrit sans IA.
- **L'IA peut se tromper : pourquoi lui faire confiance ?** On ne le demande pas : elle ne conclut
  jamais seule. Ses lectures sont en pointillés, le tribunal et le public concluent, et
  « informations insuffisantes » est une conclusion normale.
- **Comment protégez-vous les données des personnes ?** Une image n'est lue par l'IA qu'en copie
  protégée (visages floutés, informations cachées retirées) ; limites de débit, rôles vérifiés côté
  serveur, jeton entre le site et le service d'IA, sceau signé.
- **Qu'est-ce qui est vraiment fait, et qu'est-ce qui est simulé ?** Réel : fil, enquêtes, scan,
  tribunal, sceau, assistant, extension, mobile. Données de démo : les affaires et les comptes. Pas
  encore : traduction complète en malgache, vérifications de tiers (clé Google à renseigner).
- **Comment passer à grande échelle ?** Services sans état sur Vercel et Render, base Postgres
  gérée, clés d'IA en rotation, limites par adresse.
- **Quelle différence avec un site de fact-checking ?** Vyra ne publie pas de verdicts de
  journalistes : il montre le raisonnement, les pièces et le niveau de certitude, et il se
  glisse là où l'information circule (extension, mobile).
