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
  async headers() {
    return [
      {
        source: '/api/v1/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: apiCorsOrigin },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          { key: 'Access-Control-Max-Age', value: '86400' },
        ],
      },
    ];
  },
  ...(pollIntervalMs ? { watchOptions: { pollIntervalMs } } : {}),
};

export default nextConfig;
