import path from 'node:path';
import type { NextConfig } from 'next';

// Racine du projet Next.js = ce dossier (web/), même si on lance une commande depuis la racine.
const projectRoot = path.resolve(__dirname);

const nextConfig: NextConfig = {
  turbopack: { root: projectRoot },
  poweredByHeader: false,
};

export default nextConfig;
