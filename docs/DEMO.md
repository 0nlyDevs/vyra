# La démo en direct

Le jury regarde la démo sur le projecteur. Elle doit marcher à chaque fois, à l'identique.

## Le script (à écrire une fois le sujet connu)

Chaque ligne : ce qu'on clique, ce qu'on dit. 3 à 5 minutes au total.

| # | Écran | Ce qu'on fait | Ce qu'on dit |
|---|---|---|---|
| 1 | Accueil | — | Le problème, en une phrase |
| 2 | Choix du profil | Clic sur le profil | Qui utilise l'application |
| 3 | Écran principal | … | … |
| 4 | Moment IA | … | Ce que l'IA apporte |
| 5 | Résultat | … | L'impact, en un chiffre |

## Avant de monter sur scène

1. `make db` puis `make seed` : données de démo propres (ou le bouton « Réinitialiser la démo »).
2. `make dev`, puis ouvrir http://localhost:3000 une première fois (pages compilées d'avance).
3. Ouvrir http://127.0.0.1:8000/health : `"ai": "gemini"` si le wifi et la clé marchent.
4. Jouer le script une fois en entier.
5. Navigateur en plein écran, zoom vérifié au projecteur, notifications coupées, chargeur branché.
6. Avoir la vidéo de secours de la démo prête à lancer.

## Les plans de secours

- **Le wifi tombe** : les réponses de l'IA viennent de `processing/app/fallbacks/`. On répète ce cas
  avant avec `DEMO_OFFLINE=true` dans `processing/.env` (relancer `make dev`).
- **Le PC plante** : la vidéo de la démo, enregistrée la nuit (QuickTime ou OBS).
- **Une donnée a été abîmée en répétition** : bouton « Réinitialiser la démo ».
