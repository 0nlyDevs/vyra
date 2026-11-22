// Applique les migrations de web/drizzle à la base. Utilisé par le déploiement de production
// (`vercel-build`) et par la CI.
//
// Remplace `drizzle-kit migrate` : son indicateur de progression efface le message d'erreur dans
// les journaux Vercel, on ne voyait pas pourquoi un déploiement s'arrêtait. Ici l'erreur est écrite
// en clair. Il installe aussi pgvector sur une base neuve (sans lui : « le type vector n'existe
// pas ») et rattache une base déjà remplie, mais sans journal de migrations (créée avec `db:push`),
// à la première migration au lieu de la rejouer, ce qui échouerait avec « la table existe déjà ».
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const FOLDER = 'drizzle';

function say(message: string) {
  process.stdout.write(`migrations : ${message}\n`);
}

function describe(error: unknown): string {
  const pg = error as {
    code?: string;
    message?: string;
    detail?: string;
    hint?: string;
    routine?: string;
    cause?: unknown;
  };
  return [
    `code ${pg.code ?? '?'}`,
    pg.message,
    pg.detail && `détail : ${pg.detail}`,
    pg.hint && `conseil : ${pg.hint}`,
    pg.routine && `routine : ${pg.routine}`,
    pg.cause && `cause : ${describe(pg.cause)}`,
  ]
    .filter(Boolean)
    .join(' | ');
}

async function main() {
  try {
    process.loadEnvFile('.env.local');
  } catch {
    // Pas de .env.local : les variables sont déjà dans l'environnement.
  }
  // Connexion directe (sans pooler) quand elle existe : plus sûr pour modifier les tables.
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL manquante.');

  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    // La base doit connaître pgvector avant la première table (colonnes `vector`). En local, Docker
    // l'installe à la création (docker/initdb) ; sur une base neuve en ligne, c'est ici.
    await sql`create extension if not exists vector`;
    // Base déjà remplie dont le journal ne connaît pas la migration de base (journal absent, vide
    // ou daté autrement) : on l'enregistre comme appliquée au lieu de la rejouer.
    const [state] = await sql<{ filled: boolean }[]>`
      select to_regclass('public.profiles') is not null as filled`;
    const [first] = readMigrationFiles({ migrationsFolder: FOLDER });
    if (state?.filled && first) {
      await sql`create schema if not exists drizzle`;
      await sql`create table if not exists drizzle.__drizzle_migrations
        (id serial primary key, hash text not null, created_at bigint)`;
      const [known] = await sql<{ known: boolean }[]>`
        select exists(
          select 1 from drizzle.__drizzle_migrations where hash = ${first.hash}
        ) as known`;
      if (!known?.known) {
        await sql`insert into drizzle.__drizzle_migrations (hash, created_at)
          values (${first.hash}, ${first.folderMillis})`;
        say(`base existante : ${first.hash.slice(0, 8)} enregistrée comme appliquée`);
      }
    }

    await migrate(drizzle(sql), { migrationsFolder: FOLDER });
    const [after] = await sql<{ count: number }[]>`
      select count(*)::int as count from drizzle.__drizzle_migrations`;
    const total = readMigrationFiles({ migrationsFolder: FOLDER }).length;
    say(`à jour (${after?.count ?? 0} appliquée(s) sur ${total})`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`migrations : ÉCHEC — ${describe(error)}\n`);
  process.exit(1);
});
