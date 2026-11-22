# Le hackathon du DevFest Antananarivo 2026

Ce qui est fixé par le règlement.

- **Quand** : du samedi 21 novembre 2026 à 8 h au dimanche 22 novembre à midi (24 heures), à Axian
  University (Galaxy Andraharo). Organisation : GDG Antananarivo avec AlgoMada.
- **Thème : Fight the misinformation.** Aider les utilisateurs à identifier les fausses
  informations, les images manipulées et les contenus générés par IA ; exploiter l'IA, le traitement
  automatique du langage, l'analyse de données ou le cloud pour vérifier les sources, détecter les
  manipulations et faciliter le fact-checking, avec des outils accessibles à tous, y compris aux
  personnes peu familiarisées avec le numérique et aux communautés locales.
- **Objectifs** : concevoir une solution numérique innovante (web, mobile, cloud, IA), allier
  performance technique, sécurité et valeur d'usage réelle, démontrer un prototype fonctionnel.
- **Équipes** de 2 à 5 personnes ; outils d'IA autorisés et encouragés.
- **Livrables** : code source complet sur un dépôt public (GitHub) avec un README d'installation,
  prototype fonctionnel, documentation, pitch (5 minutes de présentation, 3 minutes de questions).

## Barème (100 points)

| Critère | Points | Où Vyra y répond |
|---|---|---|
| Innovation et pertinence par rapport au thème | 25 | Tribunal à conclusion signée, jamais de verdict d'IA seule, examen d'images et de médias, extension et mobile, pensé pour Madagascar ([README](../README.md)) |
| Qualité technique, architecture, maintenabilité, sécurité | 25 | [ARCHITECTURE.md](ARCHITECTURE.md) : propriétaire unique de la base, migrations versionnées, rotation de clés, limites de débit, copie protégée des images ; tests (`npm test`, `pytest`) exécutés par la CI |
| Compréhension et documentation | 25 | Ce dossier `docs/` et le [README](../README.md) : installation, rôles, architecture, API mobile, démo |
| Pitch et démonstration en direct | 25 | [PITCH.md](PITCH.md) et [DEMO.md](DEMO.md) |
