# Qui fait quoi

## Les rôles dans l'application

| Rôle | Libellé | Pouvoirs |
|---|---|---|
| Visiteur (sans compte) | : | Vérifier un message, lire une conclusion, signaler, vérifier un sceau, flash radio, extension |
| `member` | Citoyen | Fil, enquêtes, scan, tribunal et vote, assistant, jeu, boîte d'alertes (10 signalements par jour) |
| `admin` | Vérificateur | Tout ce qui précède, plus : voir les groupes d'alertes, ouvrir une affaire sans attendre le seuil de 5 signalements, tenir l'annuaire officiel, réinitialiser la démo |

Les droits sont vérifiés côté serveur (`isVerifier` dans `web/src/lib/domain.ts`), jamais côté
client. Comptes de démo : `rasoa@vyra.demo` (Vérificateur), `hery@vyra.demo` (Citoyen).

## L'équipe

D'après l'historique git (`git shortlog -sn`), par domaine :

| Domaine | Dossiers |
|---|---|
| Enquêtes : arbre des versions, exploration du web, recherche élargie | `web/src/features/investigation` |
| Scan d'images, de vidéos et de vocaux ; lectures IA en pointillés ; API mobile du scan | `web/src/features/scan`, `processing/app/services/media*` |
| Jeu « Vrai ou fake ? » | `web/src/features/game` |
| Sécurité, migrations, CI, déploiement, rotation des clés Tavily et Fact Check | `.github/`, `web/drizzle`, `processing/app/services/key_pool.py` |
| Accueil animé, extension | `web/src/features/landing`, `extension/` |
| Design « encre et papier » (mobile, extension) | `vyra-mobile/src/ui`, `extension/sidepanel.css` |
| Fil d'actualité, assistant et voix, chaîne de fournisseurs d'IA, mobile, extension | `web/src/features/feed`, `web/src/features/assistant`, `processing/app/services/providers.py` |
| Build Android automatique | `vyra-mobile` (CI) |

Règle : chacun travaille dans ses dossiers et ouvre une PR vers `main`, fusionnée en *squash*.
Messages de commit conventionnels (`feat:`, `fix:`, `docs:`…).
