import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/states/States';
import { PlayStage } from '@/features/game3d/PlayStage';
import { listScenarios } from '@/server/dal/game';
import { requireProfile } from '@/server/session';

export const metadata = { title: 'Une série' };

// Une série du jeu vrai ou fake, de la première information au score.
export default async function GamePlayPage() {
  await requireProfile();
  const scenarios = await listScenarios();

  return (
    <div className="grid gap-8">
      <PageHeader eyebrow="Vrai ou fake ?" title="Une série" />
      {scenarios.length === 0 ? (
        <EmptyState
          title="Aucune information à jouer."
          description="Le bouton « Réinitialiser la démo » recrée les informations du jeu."
        />
      ) : (
        <PlayStage
          scenarios={scenarios.map(
            ({
              id,
              title,
              content,
              sourceName,
              imagePath,
              clues,
              answer,
              explanation,
              reflex,
            }) => ({
              id,
              title,
              content,
              sourceName,
              imagePath,
              clues,
              answer,
              explanation,
              reflex,
            }),
          )}
        />
      )}
    </div>
  );
}
