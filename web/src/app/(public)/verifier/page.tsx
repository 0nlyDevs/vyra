import { Search } from 'lucide-react';
import Link from 'next/link';
import { CertaintyBadge } from '@/components/common/DomainBadges';
import { PageHeader } from '@/components/common/PageHeader';
import { ToneBadge } from '@/components/common/ToneBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { formatDate } from '@/lib/format';
import { findJudgedCase, listConcludedCases } from '@/server/dal/court';
import { embedTexts } from '@/server/processing';

export const metadata = { title: 'Est-ce déjà vérifié ?' };

// « Est-ce déjà vérifié ? », sans compte : on colle le message reçu, on retrouve l'affaire
// conclue qui lui ressemble (par le sens, sinon par les mots). Jamais de verdict nouveau ici.
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? '').trim().slice(0, 2000);
  const concluded = await listConcludedCases();
  let match: Awaited<ReturnType<typeof findJudgedCase>> = null;
  if (query.length >= 10) {
    const vectors = await embedTexts([query]);
    match = await findJudgedCase(query, vectors.ok ? (vectors.data[0] ?? null) : null);
  }

  return (
    <>
      <PageHeader
        eyebrow="Ouvert à tous, sans compte"
        title="Est-ce déjà vérifié ?"
        description="Collez le message reçu, même reformulé. Si une affaire a déjà été jugée, sa conclusion s’affiche avec ses preuves."
      />
      <form action="/verifier" className="grid gap-3">
        <Textarea
          name="q"
          rows={3}
          defaultValue={query}
          placeholder="Collez ici le message reçu sur WhatsApp, Facebook…"
          aria-label="Message à vérifier"
        />
        <Button type="submit" className="justify-self-start">
          <Search aria-hidden />
          Chercher
        </Button>
      </form>

      {query.length >= 10 && (
        <section aria-live="polite">
          {match ? (
            <Card className="border-foreground">
              <CardHeader className="flex flex-wrap items-center gap-2">
                <ToneBadge tone="neutral">Déjà jugée par le tribunal</ToneBadge>
                {match.certainty && <CertaintyBadge level={match.certainty} />}
              </CardHeader>
              <CardContent className="grid gap-3">
                <CardTitle className="text-xl">{match.title}</CardTitle>
                {match.conclusion && <p className="text-pretty">{match.conclusion}</p>}
                <Button asChild className="justify-self-start">
                  <Link href={`/verifier/${match.id}`}>Voir les preuves</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <p className="rounded-xl border border-dashed p-5 text-muted-foreground text-pretty">
              Aucune affaire jugée ne ressemble à ce message. Cela ne veut pas dire qu’il est vrai :
              attendez avant de le partager, et signalez-le : une enquête s’ouvre quand plusieurs
              personnes le signalent.
              <Button asChild variant="outline" className="mt-3 flex w-fit">
                <Link href={`/verifier/signaler?texte=${encodeURIComponent(query)}`}>
                  Signaler sans compte
                </Link>
              </Button>
            </p>
          )}
        </section>
      )}

      <p className="text-muted-foreground text-sm">
        Vous avez reçu une carte de conclusion Vyra ?{' '}
        <Link href="/verifier/sceau" className="text-foreground underline underline-offset-4">
          Vérifiez son sceau
        </Link>{' '}
        : vous saurez si elle a été retouchée.
      </p>

      <section className="grid gap-4">
        <h2 className="font-semibold text-xl">Affaires déjà jugées</h2>
        {concluded.length === 0 ? (
          <p className="text-muted-foreground">Aucune affaire conclue pour le moment.</p>
        ) : (
          <ul className="grid gap-3">
            {concluded.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/verifier/${item.id}`}
                  className="grid gap-2 surface p-4 transition-colors hover:bg-muted/40"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{item.title}</span>
                    {item.certainty && <CertaintyBadge level={item.certainty} />}
                  </span>
                  <span className="text-muted-foreground text-sm line-clamp-2">
                    « {item.claim} »
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {formatDate(item.createdAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
