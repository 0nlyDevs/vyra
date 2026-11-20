import 'server-only';
import type { Database } from '@/server/db';
import { notes, profiles } from '@/server/db/schema';

// Données de démo : ce que le jury voit au début de la démo. Elles sont recréées à l'identique par
// `make seed` et par le bouton « Réinitialiser la démo ». À réécrire une fois le sujet connu.

export const DEMO_PROFILES = [
  { id: 'rasoa', name: 'Rasoa', role: 'admin', headline: 'Responsable du projet' },
  { id: 'hery', name: 'Hery', role: 'member', headline: 'Membre de l’équipe' },
] as const;

const DEMO_NOTES = [
  { profileId: 'rasoa', content: 'Préparer les données de la démo avant la répétition.' },
  { profileId: 'rasoa', content: 'Vérifier que la réponse de secours s’affiche sans wifi.' },
  { profileId: 'rasoa', content: 'Répéter le pitch : 3 minutes de démo au maximum.' },
  { profileId: 'hery', content: 'Finir l’écran principal pour le projecteur.' },
];

export async function resetDemoData(database: Database) {
  await database.transaction(async (tx) => {
    await tx.delete(notes);
    await tx.delete(profiles);
    await tx.insert(profiles).values([...DEMO_PROFILES]);
    await tx.insert(notes).values(DEMO_NOTES);
  });
}
