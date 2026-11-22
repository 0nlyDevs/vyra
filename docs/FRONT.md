# La base de l'interface

Une base concrète pour partir tous du même point. Ce ne sont pas des règles figées : elle peut
être refondue. Son seul but est qu'on ne recrée pas ce qui existe déjà.

Pour tout voir d’un coup : lancer `next dev` (`make up` en local), se connecter et saisir **`/kit`** dans l’adresse du navigateur. C’est un catalogue pour l’équipe, retiré des menus utilisateur et indisponible en production ; il est conservé pour réutiliser les composants.

## Les principes

- **Réutiliser avant de créer** : un composant de base, un badge d'état, un état de page existent
  déjà (tableau ci-dessous).
- **La couleur dit quelque chose** : elle n'est réservée qu'aux verdicts, toujours avec une icône et
  un mot. Tout le reste est à l'encre sur du papier.
- **Une page lisible d'un coup d'œil** : une chose en grand, le reste en second ; peu de défilement
  sur téléphone (rangées qui défilent de côté plutôt qu'une longue pile).
- **Accessibilité à vérifier** : tests de contrastes des jetons côté mobile, jamais la couleur
  seule, un seul titre de premier niveau par page et des niveaux sans saut. Sur écran tactile
  (`pointer-coarse`), boutons et onglets du kit atteignent 44 px ; un composant fait main doit le
  prévoir lui-même. Avec le mouvement réduit, animations et transitions CSS sont ramenées à
  0,01 ms dans `globals.css`. Ces règles ne certifient pas toutes les pages du site.

## Ce qui existe

| Besoin | Où |
|---|---|
| Couleurs, polices, thème clair et sombre | `web/src/app/globals.css` |
| Composants de base (bouton, carte, fenêtre, onglets, sélecteur, message…) | `web/src/components/ui/` |
| En-tête de page, badges d'état, étapes, bulle de parole, import de fichier, lecture à voix haute | `web/src/components/common/` |
| États d'une page : vide, erreur, chargement | `web/src/components/states/States.tsx` |
| Champ de formulaire avec aide et erreur | `web/src/components/form/FormField.tsx` |
| Barre d’onglets, en-tête et préférences de l’espace connecté | `web/src/components/shell/` et `web/src/app/(app)/layout.tsx` |
| Entrées du menu | `web/src/lib/navigation.ts` |
| Valeurs du domaine et leurs libellés (certitude, états, tons…) | `web/src/lib/domain.ts` |
| Dates en français | `web/src/lib/format.ts` |
| Un exemple complet (action, schéma Zod, IA, secours) | `web/src/features/whatif/` |

## Le thème

Direction « encre et papier » : un fond papier (`#f3f2ee`) et une encre (`#0a0a0b`) qui
s'inversent en thème sombre ; le thème suit le système par défaut et se change dans l'en-tête.
Bricolage Grotesque porte le texte ; Cormorant Garamond italique est réservée aux passages cités.
Les couleurs sont des jetons en trois couches dans `globals.css` : les valeurs brutes, puis leur
rôle, puis ce qui est propre à un composant. Le mobile (`vyra-mobile/src/lib/tokens.ts`) et
l'extension (`extension/sidepanel.css`) reprennent les mêmes valeurs.

Les briques du langage visuel, toutes dans `globals.css` :

| Classe | Pour |
|---|---|
| `display` | Les titres : interlettrage serré qui se resserre quand le corps grandit |
| `eyebrow` | La petite ligne en capitales au-dessus d'un titre |
| `surface` | Une carte : fond, reflet en haut, filet fin (sans bordure dure) |
| `bezel` + `bezel-core` | Le cadre double (coque fine autour d'un cœur), pour mettre un bloc en avant |
| `glass` | Le verre : seulement pour ce qui flotte (barre du haut, panneaux) |
| `link-arrow`, `btn-swap` | Le lien avec flèche qui glisse, la flèche qui sort et revient dans un bouton |

Boutons : des pilules. `default` (l'encre) pour l'action principale d'un écran, `solid` réservé
à l'accueil, `secondary`, `outline`, `ghost` pour le reste. Les animations passent par
`motion` (`motion/react`), GSAP restant réservé à l’accueil. `src/components/motion/Reveal.tsx`
(`Reveal` au défilement, `MaskLines` pour un titre ligne par ligne) et les courbes de
`src/lib/motion.ts` sont prêts à servir, mais aucun écran ne les utilise encore.

Dans une page, on écrit le rôle, pas la couleur : `bg-primary`, `text-muted-foreground`,
`bg-success-soft text-success`. Changer la palette de toute l'application se fait à un seul
endroit : les jetons de `globals.css`.

## Ajouter un écran

1. Créer `web/src/app/(app)/<nom>/page.tsx` : l’en-tête, les onglets et les préférences arrivent seuls.
   Y exporter `metadata = { title: '…' }` : l’onglet du navigateur affiche « … · Vyra ».
2. Commencer la page par `PageHeader`.
3. Ajouter l'entrée du menu dans `web/src/lib/navigation.ts` si c'est un écran principal.
4. Mettre la logique dans `web/src/features/<nom>/`, comme `whatif`.

Les pages des modules : `/feed` (fil d'actualité, ouvert après la connexion), `/cases`,
`/court`, `/reports`, `/game`, et `/scan`. Le jeu propose une version 3D sur ordinateur compatible et les mêmes exercices en cartes 2D. Le niveau de certitude se calcule sur les pièces ; il n’est pas décidé par la couleur ni par le vote.

## Le dossier commun : l'affaire

Quatre tables partagées par tous les modules (`web/src/server/db/schema.ts`) :

| Table | Contient |
|---|---|
| `cases` | L'information de départ, son état, sa conclusion |
| `case_versions` | Une version retrouvée : texte, source, date |
| `version_links` | Qui reprend qui, ce qui a changé, la confiance |
| `evidence` | Une pièce du dossier, citée par son numéro |

Lecture : `listCases()` et `getCaseFile(id)` dans `web/src/server/dal/cases.ts`. La page
`/cases/<id>` affiche le dossier, ses versions, ses pièces et les actions d’enquête disponibles pour le profil.

Chaque module ajoute **ses** tables dans la section prévue en bas de `schema.ts`, et ses données
de démo dans la section prévue de `web/src/server/demo/seed-data.ts`. Après un changement de
tables : `make db-push`, puis `make seed`.

Le seed contient 22 affaires : 13 scénarios inventés et 9 affaires réelles utilisées comme dossiers pédagogiques. Les comptes et les institutions de démonstration sont fictifs. Le détail et les fichiers sources sont dans [DEMO.md](DEMO.md).

## Ajouter un composant de base

`docker compose exec web npm run ui:add -- <nom>` (hors Docker : `npm run ui:add -- <nom>` dans
`web/`). Répondre non si la commande propose d'écraser un fichier existant, puis lancer
`make lint-fix`.
