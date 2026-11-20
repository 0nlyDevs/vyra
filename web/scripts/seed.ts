// Recrée les données de démo (make seed). Même code que le bouton « Réinitialiser la démo ».

async function main() {
  try {
    process.loadEnvFile('.env.local');
  } catch {
    // Pas de .env.local : les variables sont déjà dans l'environnement.
  }
  // Imports après le chargement de .env.local : env.ts lit les variables dès son import.
  const { db, closeDb } = await import('../src/server/db');
  const { resetDemoData } = await import('../src/server/demo/seed-data');
  try {
    await resetDemoData(db);
    console.log('Données de démo recréées.');
  } finally {
    await closeDb();
  }
}

main().catch((error: unknown) => {
  console.error('Échec du seed :', error);
  process.exit(1);
});
