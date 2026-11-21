import { Waypoints } from 'lucide-react';
import { CaseCard } from '@/components/common/CaseCard';
import { ModulePlaceholder } from '@/components/common/ModulePlaceholder';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/states/States';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NewCaseForm } from '@/features/investigation/NewCaseForm';
import { NEWS_FEEDS } from '@/features/investigation/news-sources';
import { PressIndexBar } from '@/features/investigation/PressIndexBar';
import { listCases } from '@/server/dal/cases';
import { getNewsIndexState } from '@/server/dal/news-index';

// `?information=…&lien=…` pré-remplit l'analyse (envoyé par l'extension du navigateur).
export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<{ information?: string; lien?: string }>;
}) {
  const { information, lien } = await searchParams;
  const [caseList, pressIndex] = await Promise.all([listCases(), getNewsIndexState()]);

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
          <NewCaseForm
            defaultClaim={(information ?? '').slice(0, 3000)}
            defaultUrl={lien?.startsWith('http') ? lien.slice(0, 2000) : ''}
          />
        </CardContent>
      </Card>
      <PressIndexBar
        total={pressIndex.total}
        embedded={pressIndex.embedded}
        sources={NEWS_FEEDS.length}
        lastHarvest={pressIndex.lastHarvest?.toISOString() ?? null}
      />
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
          'What If? : la version calme d’un contenu réel, et trois versions pour une affaire fictive.',
        ]}
        doneWhen="What If? propose la version calme d’un contenu réel."
      />
    </div>
  );
}
