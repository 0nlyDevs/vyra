# Qui fait quoi

## Les rôles dans l'application

| Rôle | Libellé | Pouvoirs |
|---|---|---|
| Visiteur (sans compte) | Visiteur | Vérifier un message, lire une conclusion, signaler, vérifier un sceau, flash radio, extension |
| `member` | Citoyen | Fil, enquêtes, scan, tribunal et vote, assistant, jeu, boîte d'alertes (10 signalements par jour) |
| `admin` | Vérificateur | Tout ce qui précède, plus : voir les groupes d'alertes, ouvrir une affaire sans attendre le seuil de 5 signalements, tenir l'annuaire officiel, réinitialiser la démo |

Les droits sont vérifiés côté serveur (`isVerifier` dans `web/src/lib/domain.ts`), jamais côté
client. Comptes de démo : `rasoa@vyra.demo` (Vérificateur), `hery@vyra.demo` (Citoyen).

## L'équipe

La répartition des modules se lit dans les dossiers suivants ; les contributions individuelles sont dans l’historique Git.

| Domaine | Dossiers |
|---|---|
| Enquêtes : arbre des versions, exploration du web, recherche élargie | `web/src/features/investigation` |
| Scan d'images, de vidéos et de vocaux ; lectures IA en pointillés ; API mobile du scan | `web/src/features/scan`, `processing/app/services/media*` |
| Jeu « Vrai ou fake ? » | `web/src/features/game`, `web/src/features/game3d` |
| Sécurité, migrations, CI, déploiement, rotation des clés Tavily et Fact Check | `.github/`, `web/drizzle`, `processing/app/services/key_pool.py` |
| Accueil animé, extension | `web/src/features/landing`, `extension/` |
| Design « encre et papier » (mobile, extension) | `vyra-mobile/src/ui`, `extension/sidepanel.css` |
| Fil d'actualité, assistant et voix, chaîne de fournisseurs d'IA, mobile, extension | `web/src/features/feed`, `web/src/features/assistant`, `processing/app/services/providers.py` |
| Client mobile et vérifications TypeScript/tests | `vyra-mobile` ; la CI du checkout audité ne génère pas d’APK |

Règle : chacun travaille dans ses dossiers et ouvre une PR vers `main`, fusionnée par un commit de merge (seul mode autorisé par le dépôt) qui reprend le titre de la PR. Voir [CONVENTIONS.md](CONVENTIONS.md).
Messages de commit conventionnels (`feat:`, `fix:`, `docs:`…).
