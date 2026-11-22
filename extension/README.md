# Extension « Vérifier ici »

Vérifier un texte, un lien ou une image sans quitter la page qu'on lit. L'extension s'ouvre en
panneau latéral et interroge la plateforme (route publique `POST /api/check`, sans compte).

- **Clic droit sur un texte sélectionné** : affaire déjà jugée qui lui ressemble, signes d'alerte
  relevés dans les mots (sans IA) et vérifications déjà publiées.
- **Clic droit sur un lien** : la plateforme lit la page, puis même analyse.
- **Clic droit sur une image** : liens de recherche inversée (Google Lens, TinEye, Yandex, Bing)
  pour retrouver sa première publication. L'image n'est envoyée nulle part.
- **Ouvrir une enquête** : un lien ouvre le module Enquêtes avec le texte et le lien pré-remplis.

Jamais de verdict nouveau : seules les conclusions du tribunal sont affichées.

## Installer (mode développeur)

1. Lancer la plateforme (`docker compose up --build`), accessible sur `http://localhost:3000`.
2. Dans Chrome, Edge ou Brave : ouvrir `chrome://extensions`, activer le **mode développeur**.
3. **Charger l'extension non empaquetée** et choisir ce dossier `extension/`.
4. Épingler l'icône. Sur n'importe quelle page : sélectionner un texte, clic droit,
   « Vérifier ce texte ».

Pas de build ni de dépendance : JavaScript, HTML et CSS tels quels (Manifest V3, Chrome 116+).

## Design

Le même « encre et papier » que la plateforme : papier et encre (le
sombre les inverse, selon le réglage du système), couleur réservée aux verdicts, toujours avec une
icône et un mot. Une ligne numérotée suit les vraies étapes : 01 contenu, 02 recherche,
03 résultat. Bricolage Grotesque porte le texte ; Cormorant Garamond italique, seulement les
passages cités. Les polices sont dans `fonts/` (aucun appel réseau) avec leur licence OFL ; les
icônes Phosphor (licence MIT) sont dans `sidepanel.html`.

## Tester

`scenarios.html` (à glisser dans Chrome) : douze scénarios réels, texte, lien, image, panneau et
plateforme arrêtée, chacun avec le résultat attendu. Pour l'ouvrir depuis le disque, activer
« Autoriser l'accès aux URL de fichier » dans les détails de l'extension.

## Vie privée

- Aucun script injecté dans les pages, aucun accès à toutes les pages, ni à l'historique ni aux
  cookies. Permissions : menu du clic droit, panneau latéral, stockage.
- Rien ne part avant le clic sur « Vérifier ce contenu ». Un texte sélectionné est envoyé comme
  texte seul.
- Le contenu en attente reste en mémoire de session. Seule l'adresse de la plateforme est gardée.
- Une adresse autre que `localhost` (plateforme en ligne) se règle dans **Réglages** et demande
  votre accord.
