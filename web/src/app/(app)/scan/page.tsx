import { ScanSearch } from 'lucide-react';
import { ModulePlaceholder } from '@/components/common/ModulePlaceholder';
import { PageHeader } from '@/components/common/PageHeader';

export default function ScanPage() {
  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Module 1 · fonction complémentaire"
        title="Scan d’image et de vocal"
        description="Importer une image ou un vocal et relever des indices. Jamais de verdict « IA ou pas »."
      />
      <ModulePlaceholder
        icon={ScanSearch}
        todo={[
          'Importer une image ou un vocal avec le composant FileDrop.',
          'Lire la signature et les informations cachées du fichier.',
          'Chercher l’image dans la base : déjà vue, avec sa date d’origine ?',
          'Lecture par l’IA : bizarreries visibles et texte écrit dans l’image.',
          'Transcrire un vocal, puis l’envoyer dans une enquête.',
        ]}
        doneWhen="une image importée affiche ses indices, et un vocal devient un texte à enquêter."
      />
    </div>
  );
}
