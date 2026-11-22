import { Info } from 'lucide-react';
import { z } from 'zod';
import { PageHeader } from '@/components/common/PageHeader';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MyReports } from '@/features/reports/MyReports';
import { ReportForm } from '@/features/reports/ReportForm';
import { ReportGroups } from '@/features/reports/ReportGroups';
import { isVerifier } from '@/lib/domain';
import {
  listGroupsByReporterCount,
  listReportsByReporter,
  listReportsOfGroups,
} from '@/server/dal/reports';
import { requireProfile } from '@/server/session';

export const metadata = { title: 'Alertes' };

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

// Boîte d'alertes. Le citoyen signale et suit ses signalements ; le vérificateur voit aussi les
// groupes d'alertes. Le fil d'actualité ouvre cette page préremplie :
// /reports?post=<id de la publication>&text=<texte>&url=<lien>.
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const profile = await requireProfile();
  const params = await searchParams;
  const verifier = isVerifier(profile.role);

  const [myReports, groups] = await Promise.all([
    listReportsByReporter(profile.id),
    verifier ? listGroupsByReporterCount() : [],
  ]);
  const groupReports = await listReportsOfGroups(groups.map((group) => group.id));

  const post = firstValue(params.post);
  const defaults = {
    content: firstValue(params.text),
    url: firstValue(params.url),
    feedPostId: z.uuid().safeParse(post).success ? post : '',
  };
  const prefilled = Boolean(defaults.feedPostId || defaults.content || defaults.url);

  const citizenView = (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Signaler un contenu</CardTitle>
        </CardHeader>
        <CardContent>
          {/* La clé recrée le formulaire quand on arrive d'une autre publication du fil. */}
          <ReportForm key={`${defaults.feedPostId}|${defaults.content}`} defaults={defaults} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Mes signalements</CardTitle>
        </CardHeader>
        <CardContent>
          <MyReports items={myReports} />
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Module 3"
        title="Boîte d’alertes"
        description="Signaler un contenu suspect. Plusieurs signalements déclenchent une vérification, jamais un verdict."
      />

      <Alert>
        <Info aria-hidden />
        <AlertDescription>
          Un signalement déclenche une vérification. Il ne dit pas que c’est faux.
        </AlertDescription>
      </Alert>

      {verifier ? (
        <Tabs defaultValue={prefilled ? 'report' : 'groups'} className="gap-6">
          <TabsList>
            <TabsTrigger value="groups">Groupes d’alertes ({groups.length})</TabsTrigger>
            <TabsTrigger value="report">Signaler</TabsTrigger>
          </TabsList>
          <TabsContent value="groups" className="text-base">
            <ReportGroups groups={groups} reports={groupReports} />
          </TabsContent>
          <TabsContent value="report" className="text-base">
            {citizenView}
          </TabsContent>
        </Tabs>
      ) : (
        citizenView
      )}
    </div>
  );
}
