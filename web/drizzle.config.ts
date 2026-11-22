import { defineConfig } from 'drizzle-kit';

// DATABASE_URL vient de `.env.local` (copié depuis `.env.example` par `make install`).
try {
  process.loadEnvFile('.env.local');
} catch {
  // Pas de .env.local : les variables sont déjà dans l'environnement.
}

// Connexion directe (sans pooler) quand elle existe : plus sûr pour modifier les tables.
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL manquante (voir web/.env.example).');

// Sur le PC, `make db-push` aligne la base Docker sur schema.ts. En ligne, ce sont les fichiers
// de `drizzle/` : après tout changement de schema.ts, `npm run db:generate` écrit la migration
// (à committer). Vercel l'applique à chaque déploiement de production (`vercel-build`), et la CI
// refuse une PR dont le schéma a changé sans migration.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url },
  strict: false,
  verbose: true,
});
