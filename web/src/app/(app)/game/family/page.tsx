import { PageHeader } from '@/components/common/PageHeader';
import { FamilyChat } from '@/features/game/FamilyChat';
import { requireProfile } from '@/server/session';

export const metadata = { title: 'Le groupe famille' };

// Bonus du jeu vrai ou fake : annoncer la vérité au groupe famille, sans vexer personne.
export default async function GameFamilyPage() {
  await requireProfile();

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Vrai ou fake ? · bonus"
        title="Le groupe famille"
        description="Tonton Fidy a partagé l’offre des 500 postes, et Cousine Mialy veut payer ce soir. Annoncez la vérité au groupe, sans vexer personne."
      />
      <FamilyChat />
    </div>
  );
}
