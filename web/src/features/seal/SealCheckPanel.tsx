import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { normalizeSealCode } from '@/server/seal';
import { checkCode, checkSignature, type SealCheck } from './check';
import { SealOutcome } from './SealOutcome';

export type SealQuery = { c?: string; s?: string; code?: string };

// Vérifier une carte partagée : son QR (lien signé) ou son code tapé à la main. Le même bloc sur la
// page publique /check/seal et dans l'onglet « Sceau » du scan ; `hidden` garde l'onglet ouvert
// après l'envoi du formulaire.
export async function SealCheckPanel({
  query,
  action,
  hidden = {},
  proofHref,
}: {
  query: SealQuery;
  action: string;
  hidden?: Record<string, string>;
  proofHref?: (id: string) => string;
}) {
  const { c, s, code } = query;
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
    <div className="grid gap-6">
      <form action={action} className="grid max-w-md gap-2">
        {Object.entries(hidden).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
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

      {check && <SealOutcome check={check} proofHref={proofHref} />}

      <p className="max-w-2xl text-muted-foreground text-pretty text-sm">
        Chaque conclusion est signée avec la clé de Vyra (Ed25519). Sans cette clé, impossible de
        fabriquer un sceau valide ni de changer un mot d’une carte sans que cela se voie. La clé
        publique est en ligne pour qui veut vérifier lui-même :{' '}
        <a href="/api/v1/seal" className="underline underline-offset-4">
          /api/v1/seal
        </a>
        .
      </p>
    </div>
  );
}
