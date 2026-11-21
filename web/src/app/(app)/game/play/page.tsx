import { Gamepad2 } from 'lucide-react';
import { ModulePlaceholder } from '@/components/common/ModulePlaceholder';
import { PageHeader } from '@/components/common/PageHeader';

// Une série du jeu (phase 5 du lot 3) : en attendant, ce qu'il reste à construire.
export default function GamePlayPage() {
  return (
    <div className="grid gap-8">
      <PageHeader eyebrow="Vrai ou fake ?" title="Une série" />
      <ModulePlaceholder
        icon={Gamepad2}
        todo={[
          'Les étapes de la série, de 1 à 5.',
          'L’information présentée comme une carte du fil d’actualité.',
          'Les indices à retourner, notés « fiable » ou « suspect ».',
          'Trois réponses : vrai, fake, impossible à dire. Puis l’explication et le réflexe.',
          'Le score et le grade en fin de série, enregistrés.',
        ]}
        doneWhen="une série de cinq informations se joue de bout en bout, avec le score."
      />
    </div>
  );
}
