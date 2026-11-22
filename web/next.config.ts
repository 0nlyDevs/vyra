import path from 'node:path';
import type { NextConfig } from 'next';

// Racine du projet Next.js = ce dossier (web/), même si on lance une commande depuis la racine.
const projectRoot = path.resolve(__dirname);

// Dernier recours, Docker sous Windows hors WSL : les modifications ne sont pas vues, on vérifie
// les fichiers toutes les N millisecondes (lent, voir README). Vide = surveillance normale.
const pollIntervalMs = Number(process.env.WATCH_POLL_INTERVAL_MS) || undefined;

// L'API mobile (`/api/v1`) répond aussi à un navigateur (aperçu web de l'application). Elle se
// connecte par un jeton `Authorization: Bearer`, jamais par cookie : ouvrir l'origine ne donne pas
// accès à la session d'un autre site. `API_CORS_ORIGIN` restreint l'origine (« * » par défaut).
const apiCorsOrigin = process.env.API_CORS_ORIGIN || '*';

const nextConfig: NextConfig = {
  turbopack: { root: projectRoot },
  poweredByHeader: false,
  // Le scan envoie une image ou un vocal par une server action : 8 Mo au plus (1 Mo par défaut).
  experimental: { serverActions: { bodySizeLimit: '10mb' } },
  // Les anciennes adresses en français restent valables pour toujours : les cartes de conclusion
  // imprimées portent un QR vers /verifier/sceau, et des liens de suivi ont été partagés. La
  // requête (?code=…) suit la redirection.
  async redirects() {
    return [
      { source: '/verifier', destination: '/check', permanent: true },
      { source: '/verifier/sceau', destination: '/check/seal', permanent: true },
      { source: '/verifier/signaler', destination: '/check/report', permanent: true },
      { source: '/verifier/suivi/:token', destination: '/check/track/:token', permanent: true },
      { source: '/verifier/flash', destination: '/check/flash', permanent: true },
      { source: '/verifier/:id', destination: '/check/:id', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        // Aucune page dans le cadre d'un autre site (contre les clics piégés sur les boutons en un
        // clic), pas de type de fichier deviné, et l'adresse complète jamais envoyée aux autres sites.
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        source: '/api/v1/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: apiCorsOrigin },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          { key: 'Access-Control-Max-Age', value: '86400' },
        ],
      },
      {
        // Les fichiers de démonstration du scan (images, vidéo) : l'aperçu web de l'application
        // mobile les lit pour les envoyer au scan. Publics, en lecture seule.
        source: '/demo/:path*',
        headers: [{ key: 'Access-Control-Allow-Origin', value: apiCorsOrigin }],
      },
    ];
  },
  ...(pollIntervalMs ? { watchOptions: { pollIntervalMs } } : {}),
};

export default nextConfig;
