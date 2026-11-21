import { Search } from 'lucide-react';
import { ModulePlaceholder } from '@/components/common/ModulePlaceholder';
import { PageHeader } from '@/components/common/PageHeader';

export default function DetectivePage() {
  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Module 4"
        title="Détective privé"
        description="Mener l’enquête sur une information fictive et apprendre un réflexe à chaque partie."
      />
      <ModulePlaceholder
        icon={Search}
        todo={[
          'La mission : un client apporte une information fictive.',
          'Collecter et examiner les indices : source, date, image, auteur, autres médias.',
          'Décider : publier, ne pas publier, ou vérifier encore.',
          'Explication finale : ce qu’il fallait voir, et le réflexe à garder.',
          'Score par affaire et grades : stagiaire, enquêteur, inspecteur.',
        ]}
        doneWhen="une partie se termine avec son explication."
      />
    </div>
  );
}
