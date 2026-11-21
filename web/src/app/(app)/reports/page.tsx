import { Siren } from 'lucide-react';
import { ModulePlaceholder } from '@/components/common/ModulePlaceholder';
import { PageHeader } from '@/components/common/PageHeader';

export default function ReportsPage() {
  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Module 3"
        title="Boîte d’alertes"
        description="Signaler un contenu suspect. Plusieurs signalements déclenchent une vérification, jamais un verdict."
      />
      <ModulePlaceholder
        icon={Siren}
        todo={[
          'Signaler un lien, un texte ou une capture, avec un motif et une description.',
          'Regrouper par le sens les signalements qui parlent du même contenu.',
          'À cinq signaleurs différents, ouvrir une affaire.',
          'Écran du vérificateur : les groupes d’alertes, triés par nombre de signaleurs.',
          'Suivi pour le signaleur : reçu, regroupé, en vérification, conclu.',
        ]}
        doneWhen="cinq signalements différents ouvrent une affaire."
      />
    </div>
  );
}
