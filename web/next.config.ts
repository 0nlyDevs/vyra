import path from 'node:path';
import type { NextConfig } from 'next';

// Racine du projet Next.js = ce dossier (web/), même si on lance une commande depuis la racine.
const projectRoot = path.resolve(__dirname);

// Dernier recours, Docker sous Windows hors WSL : les modifications ne sont pas vues, on vérifie
// les fichiers toutes les N millisecondes (lent, voir README). Vide = surveillance normale.
const pollIntervalMs = Number(process.env.WATCH_POLL_INTERVAL_MS) || undefined;

const nextConfig: NextConfig = {
  turbopack: { root: projectRoot },
  poweredByHeader: false,
  ...(pollIntervalMs ? { watchOptions: { pollIntervalMs } } : {}),
};

export default nextConfig;
