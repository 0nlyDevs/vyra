import {
  Gamepad2,
  Gavel,
  House,
  type LucideIcon,
  Palette,
  ScanSearch,
  Siren,
  Smartphone,
  Waypoints,
} from 'lucide-react';

// La navigation de l'application, à un seul endroit : la barre latérale et l'accueil la lisent.
// Ajouter un écran principal = ajouter une ligne ici et créer son dossier dans src/app/(app)/.

// Page ouverte après la connexion. À passer sur le fil d'actualité quand il existera.
export const AFTER_SIGN_IN_PATH = '/dashboard';

export type NavItem = {
  href: string;
  label: string;
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
    href: '/cases',
    label: 'Enquêtes',
    description: 'Retracer l’histoire d’une information, version par version.',
    icon: Waypoints,
  },
  {
    href: '/scan',
    label: 'Scan',
    description: 'Examiner une image ou un vocal et relever les indices.',
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
    description: 'Apprendre à distinguer le vrai du faux, en jouant.',
    icon: Gamepad2,
  },
  {
    href: '/phone',
    label: 'Téléphone',
    description: 'La bulle d’analyse sur un téléphone simulé.',
    icon: Smartphone,
  },
];

export const KIT_ITEM: NavItem = {
  href: '/kit',
  label: 'Kit d’interface',
  description: 'Les couleurs et les composants partagés.',
  icon: Palette,
};
