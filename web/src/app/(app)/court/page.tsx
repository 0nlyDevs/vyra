import { Gavel } from 'lucide-react';
import { ModulePlaceholder } from '@/components/common/ModulePlaceholder';
import { PageHeader } from '@/components/common/PageHeader';

export default function CourtPage() {
  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Module 2"
        title="Tribunal"
        description="Deux IA plaident, les pièces témoignent, vous votez, puis le juge conclut avec un niveau de certitude."
      />
      <ModulePlaceholder
        icon={Gavel}
        todo={[
          'Choisir une affaire et ouvrir l’audience.',
          'Plaidoirie de l’accusation, puis de la défense : chacune cite ses pièces par leur numéro.',
          'Les pièces passent à la barre, avec leur source et leur date.',
          'Vote de la personne avant la conclusion : exacte, trompeuse, ou « je ne sais pas ».',
          'Conclusion du juge : niveau de certitude, éléments confirmés, contestés, manquants.',
          '« Déjà jugé » : une information proche d’une affaire conclue affiche sa conclusion.',
        ]}
        doneWhen="une audience se joue de bout en bout, avec sa réponse de secours sans wifi."
      />
    </div>
  );
}
