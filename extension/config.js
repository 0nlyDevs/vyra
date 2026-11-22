// Réglages fixes de l'extension : adresse par défaut, délais, limites et listes.

// La plateforme en ligne par défaut ; une autre adresse (http://localhost:3000 en développement)
// se règle dans Réglages.
export const DEFAULT_BASE_URL = 'https://vyra-mg.vercel.app';
// Une première requête sur un hébergement qui s'endort peut être longue : au-delà, on s'arrête.
export const CHECK_TIMEOUT_MS = 40_000;
export const REVERSE_SEARCH = [
  ['Google Lens', (url) => `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(url)}`],
  ['TinEye', (url) => `https://tineye.com/search?url=${encodeURIComponent(url)}`],
  ['Yandex Images', (url) => `https://yandex.com/images/search?rpt=imageview&url=${encodeURIComponent(url)}`],
  ['Bing', (url) => `https://www.bing.com/images/search?view=detailv2&iss=sbi&q=imgurl:${encodeURIComponent(url)}`],
];
// Les tons de la plateforme, rangés dans les familles de verdict (icône et mot, jamais
// la couleur seule).
export const FAMILIES = {
  success: { family: 'true', icon: 'seal-check' },
  danger: { family: 'false', icon: 'x' },
  warning: { family: 'misleading', icon: 'warning' },
  info: { family: 'unverifiable', icon: 'question' },
  neutral: { family: 'neutral', icon: 'info' },
};
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const STEPS = ['Contenu', 'Recherche', 'Résultat'];
