import { CircleHelp, ShieldAlert, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { z } from 'zod';
import { CertaintyBadge } from '@/components/common/DomainBadges';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { checkCode, checkSignature, type SealCheck } from '@/features/seal/check';
import type { SealedContent } from '@/server/seal';
import { normalizeSealCode } from '@/server/seal';

export const metadata = { title: 'Vérifier un sceau' };

function Verdict({ content }: { content: SealedContent }) {
  return (
    <div className="grid gap-3 rounded-xl bg-card p-4">
      <p className="text-muted-foreground text-sm">Ce qui circule</p>
      <p className="text-pretty font-medium">« {content.claim} »</p>
      <span className="justify-self-start">
        <CertaintyBadge level={content.certainty} />
      </span>
      <p className="text-pretty">{content.conclusion}</p>
      <Button asChild variant="outline" className="justify-self-start">
        <Link href={`/verifier/${content.id}`}>Voir les preuves</Link>
      </Button>
    </div>
  );
}

function Result({
  tone,
  icon,
  title,
  children,
}: {
  tone: 'success' | 'danger' | 'neutral';
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  const box = {
    success: 'border-success bg-success-soft',
    danger: 'border-danger bg-danger-soft',
    neutral: 'border-dashed',
  }[tone];
  return (
    <section aria-live="polite" className={`grid gap-4 rounded-2xl border-2 p-5 ${box}`}>
      <h2 className="flex items-center gap-2.5 font-semibold text-2xl">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function Outcome({ check }: { check: SealCheck }) {
  if (check.status === 'genuine') {
    return (
      <Result
        tone="success"
        icon={<ShieldCheck aria-hidden className="size-7 shrink-0 text-success" />}
        title={`Sceau authentique · ${check.code}`}
      >
        <p className="text-pretty">
          Cette conclusion vient bien de Vyra. Comparez-la mot pour mot avec la carte reçue : si le
          texte de la carte diffère, la carte a été retouchée.
        </p>
        <Verdict content={check.content} />
      </Result>
    );
  }
  if (check.status === 'mismatch') {
    return (
      <Result
        tone="danger"
        icon={<ShieldAlert aria-hidden className="size-7 shrink-0 text-danger" />}
        title="Ce sceau ne correspond pas"
      >
        <p className="text-pretty">
          La carte a été modifiée, ou la conclusion a changé depuis qu’elle a été faite. Ne la
          partagez pas. Voici la conclusion actuelle, la seule qui fait foi
          {check.code ? ` (sceau ${check.code})` : ''}.
        </p>
        <Verdict content={check.content} />
      </Result>
    );
  }
  return (
    <Result
      tone="neutral"
      icon={<CircleHelp aria-hidden className="size-7 shrink-0 text-muted-foreground" />}
      title="Aucune conclusion avec ce sceau"
    >
      <p className="text-pretty text-muted-foreground">
        Vérifiez le code (huit caractères après VY). S’il est juste, la carte ne vient pas de Vyra,
        même si elle en porte la marque.
      </p>
    </Result>
  );
}

// Vérifier une carte partagée : son QR (lien signé) ou son code tapé à la main. Sans compte.
export default async function SealPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; s?: string; code?: string }>;
}) {
  const { c, s, code } = await searchParams;
  const typed = (code ?? '').slice(0, 40);
  let check: SealCheck | null = null;
  let badCode = false;
  if (c && s && z.uuid().safeParse(c).success) {
    check = await checkSignature(c, s.slice(0, 120));
  } else if (typed.trim()) {
    const normalized = normalizeSealCode(typed);
    if (normalized) check = await checkCode(normalized);
    else badCode = true;
  }

  return (
    <>
      <PageHeader
        eyebrow="Ouvert à tous, sans compte"
        title="Vérifier un sceau"
        description="Une carte de conclusion Vyra porte un QR et un code. Scannez le QR, ou tapez le code : vous voyez si la carte est authentique, et la vraie conclusion."
      />
      <form action="/verifier/sceau" className="grid max-w-md gap-2">
        <label htmlFor="seal-code" className="font-medium">
          Code du sceau
        </label>
        <div className="flex gap-2">
          <Input
            id="seal-code"
            name="code"
            defaultValue={typed}
            placeholder="VY-XXXX-XXXX"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={badCode || undefined}
            aria-describedby={badCode ? 'seal-code-error' : undefined}
            className="font-mono uppercase"
          />
          <Button type="submit">Vérifier</Button>
        </div>
        {badCode && (
          <p id="seal-code-error" className="text-danger text-sm">
            Un code a huit caractères après VY, par exemple VY-7K2M-Q9XD.
          </p>
        )}
      </form>

      {check && <Outcome check={check} />}

      <p className="max-w-2xl text-muted-foreground text-pretty text-sm">
        Chaque conclusion est signée avec la clé de Vyra (Ed25519). Sans cette clé, impossible de
        fabriquer un sceau valide ni de changer un mot d’une carte sans que cela se voie. La clé
        publique est en ligne pour qui veut vérifier lui-même :{' '}
        <a href="/api/v1/seal" className="underline underline-offset-4">
          /api/v1/seal
        </a>
        .
      </p>
    </>
  );
}
