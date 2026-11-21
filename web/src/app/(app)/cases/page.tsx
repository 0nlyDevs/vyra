import { Waypoints } from 'lucide-react';
import { CaseCard } from '@/components/common/CaseCard';
import { ModulePlaceholder } from '@/components/common/ModulePlaceholder';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/states/States';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NewCaseForm } from '@/features/investigation/NewCaseForm';
import { listCases } from '@/server/dal/cases';

export default async function CasesPage() {
  const caseList = await listCases();

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Module 1"
        title="Enquêtes"
        description="Retracer l’histoire d’une information : ses versions retrouvées et ce qui a changé de l’une à l’autre."
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Nouvelle analyse</CardTitle>
        </CardHeader>
        <CardContent>
          <NewCaseForm />
        </CardContent>
      </Card>
      {caseList.length === 0 ? (
        <EmptyState title="Aucune affaire pour l’instant." />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {caseList.map((item) => (
            <CaseCard key={item.id} item={item} href={`/cases/${item.id}`} />
          ))}
        </div>
      )}
      <ModulePlaceholder
        icon={Waypoints}
        todo={[
          'Afficher le graphe des versions, la plus ancienne retrouvée à gauche.',
          'Comparer deux versions, avec les mots changés surlignés.',
          'What If? : la version calme d’un contenu réel, et trois versions pour une affaire fictive.',
        ]}
        doneWhen="une affaire s’affiche en graphe et deux de ses versions se comparent."
      />
    </div>
  );
}
