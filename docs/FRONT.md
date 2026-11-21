# La base de l'interface

Une base concrète pour partir tous du même point. Ce ne sont pas des règles figées : elle peut
être refondue. Son seul but est qu'on ne recrée pas ce qui existe déjà.

Pour tout voir d'un coup : lancer l'application, entrer avec un profil, ouvrir **Kit d'interface**
(`/kit`) dans la barre latérale.

## Ce qui existe

| Besoin | Où |
|---|---|
| Couleurs, polices, thème clair et sombre | `web/src/app/globals.css` |
| Composants de base (bouton, carte, fenêtre, onglets, sélecteur, message…) | `web/src/components/ui/` |
| En-tête de page, badges d'état, étapes, bulle de parole, import de fichier | `web/src/components/common/` |
| États d'une page : vide, erreur, chargement | `web/src/components/states/States.tsx` |
| Champ de formulaire avec aide et erreur | `web/src/components/form/FormField.tsx` |
| Barre latérale et en-tête de l'espace connecté | `web/src/components/shell/` et `web/src/app/(app)/layout.tsx` |
| Entrées du menu | `web/src/lib/navigation.ts` |
| Valeurs du domaine et leurs libellés (certitude, états, tons…) | `web/src/lib/domain.ts` |
| Dates en français | `web/src/lib/format.ts` |
| Un exemple complet (base, IA, secours) | `web/src/features/notes/` et la page `/exemple` |

## Le thème

Rouge MindStack, en clair (par défaut, plus lisible au projecteur) et en sombre (bouton dans
l'en-tête). Les couleurs sont des jetons en trois couches dans `globals.css` : les valeurs brutes,
puis leur rôle, puis ce qui est propre à un composant.

Dans une page, on écrit le rôle, pas la couleur : `bg-primary`, `text-muted-foreground`,
`bg-success-soft text-success`. Changer le rouge de toute l'application se fait à un seul endroit :
le nuancier `--red-*`.

## Ajouter un écran

1. Créer `web/src/app/(app)/<nom>/page.tsx` : la barre latérale et l'en-tête arrivent seuls.
2. Commencer la page par `PageHeader`.
3. Ajouter l'entrée du menu dans `web/src/lib/navigation.ts` si c'est un écran principal.
4. Mettre la logique dans `web/src/features/<nom>/`, comme l'exemple `notes`.

Les pages des modules existent déjà, vides : `/cases`, `/scan`, `/court`, `/reports`,
`/detective`, `/phone`. Chacune affiche ce qu'il reste à construire ; on retire ce bloc quand le
module a son contenu.

## Le dossier commun : l'affaire

Quatre tables partagées par tous les modules (`web/src/server/db/schema.ts`) :

| Table | Contient |
|---|---|
| `cases` | L'information de départ, son état, sa conclusion |
| `case_versions` | Une version retrouvée : texte, source, date |
| `version_links` | Qui reprend qui, ce qui a changé, la confiance |
| `evidence` | Une pièce du dossier, citée par son numéro |

Lecture : `listCases()` et `getCaseFile(id)` dans `web/src/server/dal/cases.ts`. La page
`/cases/<id>` affiche un dossier en lecture seule.

Chaque module ajoute **ses** tables dans la section prévue en bas de `schema.ts`, et ses données
de démo dans la section prévue de `web/src/server/demo/seed-data.ts`. Après un changement de
tables : `make db-push`, puis `make seed`.

Trois affaires de démo sont en base (deux réelles, une fictive pour les exercices). Tous les
lieux, médias et organismes y sont inventés.

## Ajouter un composant de base

`docker compose exec web npm run ui:add -- <nom>` (hors Docker : `npm run ui:add -- <nom>` dans
`web/`). Répondre non si la commande propose d'écraser un fichier existant, puis lancer
`make lint-fix`.
