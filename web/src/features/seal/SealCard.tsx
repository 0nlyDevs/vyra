import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShareCard } from '@/features/court/ShareCard';
import type { CertaintyLevel } from '@/lib/domain';
import { sealForCase } from './check';

// Le sceau de la conclusion, dans le dossier d'une affaire jugée : le QR et le code qui renvoient à
// la conclusion signée, puis la carte à partager. Le même bloc que l'écran du dossier sur mobile.
export async function SealCard({
  caseId,
  claim,
  certainty,
  conclusion,
}: {
  caseId: string;
  claim: string;
  certainty: CertaintyLevel;
  conclusion: string;
}) {
  const seal = await sealForCase(caseId);
  if (!seal) return null;
  const qr = await QRCode.toDataURL(seal.url, { margin: 1, width: 264 });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <ShieldCheck aria-hidden className="size-5" />
          Sceau de la conclusion
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="flex flex-wrap items-center gap-5">
          {/* biome-ignore lint/performance/noImgElement: QR en data URL produit à la volée, rien à optimiser */}
          <img
            src={qr}
            alt={`QR du sceau ${seal.code}`}
            width={132}
            height={132}
            className="rounded-xl bg-white"
          />
          <div className="grid min-w-[12rem] flex-1 gap-2">
            <p className="font-mono font-semibold text-xl tracking-wider">{seal.code}</p>
            <p className="text-muted-foreground text-pretty">
              Partagée avec ce code, la conclusion se vérifie mot pour mot : une carte retouchée ne
              le passe pas.
            </p>
            <Link
              href="/scan?onglet=sceau"
              className="justify-self-start text-sm underline underline-offset-4"
            >
              Vérifier un sceau reçu
            </Link>
          </div>
        </div>
        <ShareCard caseId={caseId} claim={claim} certainty={certainty} conclusion={conclusion} />
      </CardContent>
    </Card>
  );
}
