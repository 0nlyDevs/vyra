# Documentation de Vyra

Cette documentation décrit le code du dépôt et les contrats effectivement présents. Elle ne
certifie pas qu’une version identique est déjà déployée ni qu’une clé fournisseur fonctionne.
Audit du 22 novembre 2026 : voir [AUDIT-DOCUMENTATION.md](AUDIT-DOCUMENTATION.md).

| Besoin | Document |
|---|---|
| Comprendre le produit et l’installer | [README principal](../README.md) |
| Relier le projet aux modalités et au barème | [DEVFEST.md](DEVFEST.md) |
| Expliquer les technologies, décisions, données, signatures et limites | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Préparer les cinq minutes et les questions | [PITCH.md](PITCH.md) |
| Répéter la démo, connaître les données et les secours | [DEMO.md](DEMO.md) |
| Savoir ce que chaque profil peut faire | [ROLES.md](ROLES.md) |
| Modifier le code | [CONVENTIONS.md](CONVENTIONS.md), [instructions du dépôt](../AGENTS.md) |
| Réutiliser l’interface et son kit local | [FRONT.md](FRONT.md) |
| Intégrer le client mobile | [API-MOBILE.md](API-MOBILE.md) |
| Installer et expliquer l’extension | [README extension](../extension/README.md) |
| Lancer le client Expo et connaître ses écrans réels | [README mobile](https://github.com/0nlyDevs/vyra-mobile/blob/main/README.md) |
| Comprendre les prompts et leurs réponses de secours | [README prompts](../processing/app/prompts/README.md) |
| Retrouver les attributions des ressources | [CREDITS.md](CREDITS.md) |

## Sources de vérité à garder ensemble

- Versions : `web/package.json`, son lockfile, `processing/requirements*.txt`,
  `processing/pyproject.toml`, `docker-compose.yml`, `package.json` du mobile.
- Variables : `web/src/lib/env.ts`, `processing/app/core/config.py` et les `.env.example`.
  Ne pas copier de clés réelles dans les documents.
- Rôles, règles et données : `web/src/lib/domain.ts`, `features/court/certainty.ts`,
  `server/demo/seed-*.ts` ; le niveau de certitude n’est pas un score produit par le modèle.
- API : les fichiers `web/src/app/api/v1/**/route.ts`. Une route disponible n’est pas
  automatiquement un écran ou un geste implémenté dans le client mobile.
- Contrôles : `Makefile` et `.github/workflows/check.yml`. `make check` couvre style, types et tests
  Python ; les tests web se lancent aussi avec `docker compose exec web npm test`. La CI vérifie
  en plus les migrations, le build et des réponses HTTP.
- Modalités : transcription des photos fournies dans [DEVFEST.md](DEVFEST.md) ; ne pas inventer
  les horaires ou les règles absentes de ces extraits.

Après un changement de comportement, mettre à jour le guide et le contrat concernés dans la
même modification. Garder les détails techniques dans la documentation ; `/kit` reste uniquement
une galerie de composants pour le développement, hors navigation utilisateur et hors production.
