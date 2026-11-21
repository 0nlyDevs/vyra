import { Smartphone } from 'lucide-react';
import { ModulePlaceholder } from '@/components/common/ModulePlaceholder';
import { PageHeader } from '@/components/common/PageHeader';

export default function PhonePage() {
  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Module 5"
        title="Portes d’entrée"
        description="Lancer une analyse depuis l’endroit où on lit : la bulle dans Chrome et sur un téléphone simulé."
      />
      <ModulePlaceholder
        icon={Smartphone}
        todo={[
          'Un écran de téléphone simulé, avec un faux fil d’actualité.',
          'La bulle flottante ouvre l’analyse du contenu choisi.',
          'L’extension Chrome (dossier extension/ à la racine du dépôt) porte la même bulle sur une page web.',
        ]}
        doneWhen="la bulle ouvre une enquête depuis une page web et depuis le téléphone simulé."
      />
    </div>
  );
}
