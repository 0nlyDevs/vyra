import { defineConfig } from 'drizzle-kit';

// DATABASE_URL vient de `.env.local` (copié depuis `.env.example` par `make install`).
try {
  process.loadEnvFile('.env.local');
} catch {
  // Pas de .env.local : les variables sont déjà dans l'environnement.
}

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL manquante (voir web/.env.example).');

// Pas de fichiers de migration : `make db-push` aligne la base sur schema.ts. À 5 sur 24 h,
// cela évite les conflits de migrations ; les données de démo sont recréées par `make seed`.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/server/db/schema.ts',
  dbCredentials: { url },
  strict: false,
  verbose: true,
});
