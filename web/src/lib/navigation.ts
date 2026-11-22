import {
  Gamepad2,
  Gavel,
  House,
  type LucideIcon,
  Newspaper,
  Palette,
  ScanSearch,
  Siren,
  Waypoints,
} from 'lucide-react';

// La navigation de l'application, à un seul endroit : l'île d'onglets, la barre du téléphone et
// l'accueil la lisent.
// Ajouter un écran principal = ajouter une ligne ici et créer son dossier dans src/app/(app)/.

// Page ouverte après la connexion : le fil d'actualité.
export const AFTER_SIGN_IN_PATH = '/feed';

export type NavItem = {
  href: string;
  label: string;
  /** Libellé court pour la barre d'encre du téléphone (sous 640 px). */
  short?: string;
  description: string;
  icon: LucideIcon;
};

export const HOME_ITEM: NavItem = {
  href: '/dashboard',
  label: 'Accueil',
  description: 'Vue d’ensemble des modules.',
  icon: House,
};

export const MODULE_ITEMS: NavItem[] = [
  {
    href: '/feed',
    label: 'Fil d’actualité',
    short: 'Fil',
    description: 'Les informations qui circulent, avec leur état de vérification.',
    icon: Newspaper,
  },
  {
    href: '/cases',
    label: 'Enquêtes',
    description: 'Retracer l’histoire d’une information, version par version.',
    icon: Waypoints,
  },
  {
    href: '/scan',
    label: 'Scan',
    description: 'Examiner une image, un vocal ou un lien et relever les indices.',
    icon: ScanSearch,
  },
  {
    href: '/court',
    label: 'Tribunal',
    description: 'Deux plaidoiries, des pièces, votre vote, puis la conclusion.',
    icon: Gavel,
  },
  {
    href: '/reports',
    label: 'Alertes',
    description: 'Signaler un contenu suspect et suivre sa vérification.',
    icon: Siren,
  },
  {
    href: '/game',
    label: 'Vrai ou fake',
    short: 'Jeu',
    description: 'Apprendre à distinguer le vrai du faux, en jouant.',
    icon: Gamepad2,
  },
];

// Les onglets de l'espace connecté, dans l'ordre : ce qui ne tient pas se replie dans « Plus ».
export const TAB_ITEMS: NavItem[] = [HOME_ITEM, ...MODULE_ITEMS];

export const KIT_ITEM: NavItem = {
  href: '/kit',
  label: 'Kit d’interface',
  description: 'Les couleurs et les composants partagés.',
  icon: Palette,
};
