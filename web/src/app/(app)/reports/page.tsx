import { Info, Siren } from 'lucide-react';
import { z } from 'zod';
import { ModulePlaceholder } from '@/components/common/ModulePlaceholder';
import { PageHeader } from '@/components/common/PageHeader';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MyReports } from '@/features/reports/MyReports';
import { ReportForm } from '@/features/reports/ReportForm';
import { listReportsByReporter } from '@/server/dal/reports';
import { requireProfile } from '@/server/session';

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

// Boîte d'alertes. Le fil d'actualité ouvre cette page préremplie :
// /reports?post=<id de la publication>&text=<texte>&url=<lien>.
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const profile = await requireProfile();
  const params = await searchParams;
  const myReports = await listReportsByReporter(profile.id);

  const post = firstValue(params.post);
  const defaults = {
    content: firstValue(params.text),
    url: firstValue(params.url),
    feedPostId: z.uuid().safeParse(post).success ? post : '',
  };

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

      <ModulePlaceholder
        icon={Siren}
        todo={[
          'Écran du vérificateur : les groupes d’alertes, triés par nombre de signaleurs.',
          'Une barre vers le seuil de cinq signaleurs, et « Ouvrir l’affaire maintenant ».',
        ]}
        doneWhen="le vérificateur voit les groupes et ouvre une affaire en un clic."
      />
    </div>
  );
}
