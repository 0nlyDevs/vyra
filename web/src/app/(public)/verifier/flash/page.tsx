import { Radio } from 'lucide-react';
import { AiNotice } from '@/components/common/AiNotice';
import { PageHeader } from '@/components/common/PageHeader';
import { ToneBadge } from '@/components/common/ToneBadge';
import { Card, CardContent } from '@/components/ui/card';
import { FlashScript } from '@/features/radio/FlashScript';
import { buildFlash } from '@/features/radio/flash';
import { formatDate } from '@/lib/format';
import { listConcludedCases, listOpenRealCases } from '@/server/dal/court';

export const metadata = { title: 'Flash radio du jour' };

const DAY_MS = 86_400_000;

// Le flash radio du jour, pour les radios locales : un texte à lire à l'antenne, à partir des
// affaires réelles déjà jugées. Ouvert à tous, sans compte.
export default async function RadioFlashPage() {
  const [concluded, open] = await Promise.all([listConcludedCases(), listOpenRealCases()]);
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 0);
  const flash = buildFlash({
    date: formatDate(today),
    dayOfYear: Math.floor((today.getTime() - startOfYear.getTime()) / DAY_MS),
    concluded: concluded.filter((item) => item.kind === 'real'),
    openTitles: open.map((item) => item.title),
  });

  return (
    <>
      <PageHeader
        eyebrow="Pour les radios locales"
        title="Flash radio du jour"
        description="Un texte court, prêt à lire à l’antenne : ce que les audiences ont conclu, avec leur niveau de certitude, et ce qui est encore en cours de vérification."
        actions={
          <ToneBadge tone="info">
            <Radio aria-hidden />
            Environ {flash.minutes} min de lecture
          </ToneBadge>
        }
      />
      <Card>
        <CardContent className="pt-2">
          <FlashScript script={flash.script} />
        </CardContent>
      </Card>
      <AiNotice>
        Les conclusions viennent des audiences, où l’IA aide à rédiger à partir des pièces. Le flash
        lui-même est écrit sans IA : il reprend ces conclusions telles quelles.
      </AiNotice>
    </>
  );
}
