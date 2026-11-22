import { PageHeader } from '@/components/common/PageHeader';
import { SealCheckPanel, type SealQuery } from '@/features/seal/SealCheckPanel';

export const metadata = { title: 'Vérifier un sceau' };

// Vérifier une carte partagée : son QR (lien signé) ou son code tapé à la main. Sans compte.
export default async function SealPage({ searchParams }: { searchParams: Promise<SealQuery> }) {
  return (
    <>
      <PageHeader
        eyebrow="Ouvert à tous, sans compte"
        title="Vérifier un sceau"
        description="Une carte de conclusion Vyra porte un QR et un code. Scannez le QR, ou tapez le code : vous voyez si la carte est authentique, et la vraie conclusion."
      />
      <SealCheckPanel query={await searchParams} action="/check/seal" />
    </>
  );
}
