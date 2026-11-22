import { ArrowRight, Search, Waypoints } from 'lucide-react';
import Link from 'next/link';
import { AiReading } from '@/components/common/AiReading';
import { CertaintyBadge } from '@/components/common/DomainBadges';
import { ToneBadge } from '@/components/common/ToneBadge';
import { ErrorState } from '@/components/states/States';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CERTAINTY_CRITERIA } from '@/lib/domain';
import { quickCheck } from './quick-check';
import { WarningSigns } from './WarningSigns';

const LONE_URL = /^https?:\/\/\S+$/i;

// L'onglet « Texte » du scan : un message ou un lien reçu. Vyra cherche s'il a déjà été jugé,
// relève les signes d'alerte et les vérifications publiées. Jamais de verdict nouveau : pour
// creuser, on ouvre une enquête. Même examen que l'application mobile et l'extension.
export async function QuickCheckPanel({ query }: { query: string }) {
  const value = query.trim().slice(0, 3000);
  const outcome =
    value.length >= 10
      ? await quickCheck(LONE_URL.test(value) ? { url: value } : { text: value })
      : null;
  const result = outcome?.ok ? outcome.data : null;

  return (
    <div className="grid gap-6">
      <form action="/scan" className="grid gap-3">
        <input type="hidden" name="tab" value="text" />
        <label htmlFor="quick-check" className="font-medium">
          Le message ou le lien
        </label>
        <Textarea
          id="quick-check"
          name="q"
          rows={4}
          defaultValue={value}
          minLength={10}
          placeholder="« URGENT : inondation ce matin… » ou https://…"
        />
        <Button type="submit" className="justify-self-start">
          <Search aria-hidden />
          Vérifier
        </Button>
      </form>

      {outcome && !outcome.ok && <ErrorState title={outcome.message} />}

      {result && (
        <>
          {result.judged ? (
            <section className="grid gap-3 surface p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-lg">Déjà jugée par le tribunal</h3>
                <CertaintyBadge level={result.judged.certainty} />
              </div>
              <p className="font-medium text-pretty">{result.judged.title}</p>
              <p className="text-muted-foreground text-sm">
                Règle appliquée : {CERTAINTY_CRITERIA[result.judged.certainty]}
              </p>
              {result.judged.conclusion && (
                <AiReading label="Conclusion rédigée par l’IA">
                  <p className="text-pretty">{result.judged.conclusion}</p>
                </AiReading>
              )}
              <Link
                href={`/cases/${result.judged.id}`}
                className="inline-flex items-center gap-1 justify-self-start font-medium underline-offset-4 hover:underline"
              >
                Voir les preuves
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </section>
          ) : (
            <p className="surface p-5 text-muted-foreground text-pretty">
              Aucune affaire jugée ne ressemble à ce message. Cela ne veut dire ni vrai ni faux :
              ouvrez une enquête pour retrouver ses versions.
            </p>
          )}

          <WarningSigns text={result.text} />

          {result.factChecks.length > 0 && (
            <section className="grid gap-3 surface p-5">
              <h3 className="font-semibold">Vérifications déjà publiées</h3>
              <ul className="grid gap-3">
                {result.factChecks.map((check) => (
                  <li key={check.url} className="grid gap-1 rounded-xl bg-muted/50 p-3">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{check.publisher}</span>
                      {check.rating && <ToneBadge tone="info">« {check.rating} »</ToneBadge>}
                    </span>
                    <a
                      href={check.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm underline-offset-4 hover:underline"
                    >
                      {check.title || check.url}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Button asChild variant="outline" className="justify-self-start">
            <Link href={`/cases?information=${encodeURIComponent(result.text)}`}>
              <Waypoints aria-hidden />
              Envoyer dans une enquête
            </Link>
          </Button>
        </>
      )}
    </div>
  );
}
