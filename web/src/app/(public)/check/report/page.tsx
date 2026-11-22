import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { TipForm } from '@/features/reports/TipForm';

export const metadata = { title: 'Signaler sans compte' };

// Signaler un contenu suspect sans créer de compte : on reçoit un lien privé pour le suivre.
export default async function TipPage({
  searchParams,
}: {
  searchParams: Promise<{ texte?: string }>;
}) {
  const { texte } = await searchParams;
  return (
    <>
      <PageHeader
        eyebrow="Ouvert à tous, sans compte"
        title="Signaler un contenu suspect"
        description="Votre signalement rejoint ceux des autres sur le même contenu. Au-delà de quelques signalements, une enquête s’ouvre. Vous recevez un lien privé pour suivre où il en est."
      />
      <Card>
        <CardContent className="pt-2">
          <TipForm defaultContent={(texte ?? '').slice(0, 1000)} />
        </CardContent>
      </Card>
    </>
  );
}
