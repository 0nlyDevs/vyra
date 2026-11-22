import { CircleHelp, ShieldAlert, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { CertaintyBadge } from '@/components/common/DomainBadges';
import { Button } from '@/components/ui/button';
import type { SealedContent } from '@/server/seal';
import type { SealCheck } from './check';

// Le résultat de la vérification d'un sceau, partagé par la page publique /check/seal et
// l'onglet « Sceau » du scan.

function Verdict({
  content,
  proofHref,
}: {
  content: SealedContent;
  proofHref: (id: string) => string;
}) {
  return (
    <div className="grid gap-3 rounded-xl bg-card p-4">
      <p className="text-muted-foreground text-sm">Ce qui circule</p>
      <p className="text-pretty font-medium">« {content.claim} »</p>
      <span className="justify-self-start">
        <CertaintyBadge level={content.certainty} />
      </span>
      <p className="text-pretty">{content.conclusion}</p>
      <Button asChild variant="outline" className="justify-self-start">
        <Link href={proofHref(content.id)}>Voir les preuves</Link>
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

/**
 * Ce que dit la vérification d'un sceau : authentique, retouché, ou inconnu. `proofHref` mène aux
 * preuves : la page publique de l'affaire (sans compte) ou son dossier (dans l'application).
 */
export function SealOutcome({
  check,
  proofHref = (id) => `/check/${id}`,
}: {
  check: SealCheck;
  proofHref?: (id: string) => string;
}) {
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
        <Verdict content={check.content} proofHref={proofHref} />
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
        <Verdict content={check.content} proofHref={proofHref} />
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
