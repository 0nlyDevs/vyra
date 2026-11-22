# Extension « Vérifier ici »

Vérifier un texte, un lien ou une image sans quitter la page qu'on lit. L'extension s'ouvre en
panneau latéral et interroge la plateforme en ligne (`https://vyra-mg.vercel.app`, route publique `POST /api/check`, sans compte).

- **Clic droit sur un texte sélectionné** : affaire déjà jugée qui lui ressemble, signes d'alerte
  relevés dans les mots (sans IA) et vérifications déjà publiées.
- **Clic droit sur un lien** : la plateforme lit la page, puis même analyse.
- **Clic droit sur une image** : liens de recherche inversée (Google Lens, TinEye, Yandex, Bing)
  pour retrouver sa première publication. Rien n'est envoyé ; « Examiner ses informations cachées »
  lit le fichier après votre accord pour ce site.
- **Une image sans lien** (photo WhatsApp, capture) : onglet **Image**, choisie, glissée sur le
  panneau ou collée (Ctrl+V). JPEG, PNG ou WebP, 4 Mo au plus, contrôlés avant l'envoi. La
  plateforme lit ce que le fichier déclare (outil de génération, Content Credentials, appareil,
  date) sans rien garder. Jamais « authentique » ni « fausse » : aucun marqueur ne prouve rien.
- **Ouvrir une enquête** : un lien ouvre le module Enquêtes avec le texte et le lien pré-remplis.

Jamais de verdict nouveau : seules les conclusions du tribunal sont affichées.

## Installer (sans la publier)

L'extension n'est pas sur le Chrome Web Store : elle s'installe à la main, une fois par navigateur.

1. Créer le paquet : `sh extension/pack.sh` (donne `vyra-extension.zip`), puis le décompresser.
   Ou utiliser directement le dossier `extension/`.
2. Dans Chrome, Edge ou Brave : ouvrir `chrome://extensions`, activer le **mode développeur**.
3. **Charger l'extension non empaquetée** et choisir le dossier décompressé.
4. Épingler l'icône. Sur n'importe quelle page : sélectionner un texte, clic droit,
   « Vérifier ce texte ».

Elle interroge `https://vyra-mg.vercel.app` par défaut. Pour la plateforme locale
(`docker compose up --build`), mettre `http://localhost:3000` dans **Réglages** ; « Rétablir
l'adresse en ligne » y revient. La première demande sur le site en ligne peut prendre quelques
secondes (hébergement qui s'endort).

Pas de build ni de dépendance : JavaScript, HTML et CSS tels quels (Manifest V3, Chrome 116+).

## Design

Le même « encre et papier » que la plateforme : papier et encre (le
sombre les inverse, selon le réglage du système), couleur réservée aux verdicts, toujours avec une
icône et un mot. Une ligne numérotée suit les vraies étapes : 01 contenu, 02 recherche,
03 résultat. Bricolage Grotesque porte le texte ; Cormorant Garamond italique, seulement les
passages cités. Les polices sont dans `fonts/` (aucun appel réseau) avec leur licence OFL ; les
icônes Phosphor (licence MIT) sont dans `sidepanel.html`.

## Tester

`scenarios.html` (à glisser dans Chrome) : quatorze scénarios réels, texte, lien, image, panneau et
plateforme arrêtée, chacun avec le résultat attendu. Pour l'ouvrir depuis le disque, activer
« Autoriser l'accès aux URL de fichier » dans les détails de l'extension.

## Vie privée

- Aucun script injecté dans les pages, aucun accès à toutes les pages, ni à l'historique ni aux
  cookies. Permissions : menu du clic droit, panneau latéral, stockage.
- Rien ne part avant le clic sur « Vérifier ce contenu ». Un texte sélectionné est envoyé comme
  texte seul. Une image n'est envoyée que par un clic sur « Examiner cette image », et n'est pas
  conservée.
- Le contenu en attente reste en mémoire de session. Seule l'adresse de la plateforme est gardée.
- Une adresse autre que `vyra-mg.vercel.app` et `localhost` se règle dans **Réglages** et demande
  votre accord.
