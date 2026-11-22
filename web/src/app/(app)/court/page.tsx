import { CaseCard } from '@/components/common/CaseCard';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/states/States';
import { Card, CardContent } from '@/components/ui/card';
import { AlreadyJudgedForm } from '@/features/court/AlreadyJudgedForm';
import { listCases } from '@/server/dal/cases';

export const metadata = { title: 'Tribunal' };

export default async function CourtPage() {
  const caseList = await listCases();

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Module 2"
        title="Tribunal"
        description="Deux IA plaident, les pièces témoignent, vous votez, puis le juge conclut avec un niveau de certitude."
      />

      <Card>
        <CardContent>
          <AlreadyJudgedForm />
        </CardContent>
      </Card>

      <section aria-labelledby="court-cases" className="grid gap-4">
        <h2 id="court-cases" className="font-semibold text-xl">
          Toutes les affaires du tribunal
        </h2>
        {caseList.length === 0 ? (
          <EmptyState title="Aucune affaire pour l’instant." />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {caseList.map((item) => (
              <CaseCard key={item.id} item={item} href={`/court/${item.id}`} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
