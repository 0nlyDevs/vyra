'use client';

import { BookOpen, ExternalLink, FolderInput, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { ToneBadge } from '@/components/common/ToneBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/format';
import { addReferenceToCase, type FactCheckResult, searchFactChecks } from './actions';

const LANGUAGE_LABELS: Record<string, string> = { fr: 'Français', mg: 'Malagasy', en: 'English' };

function dateOf(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function AddButton({ onAdd }: { onAdd: () => Promise<boolean> }) {
  const [added, setAdded] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending || added}
      onClick={() =>
        startTransition(async () => {
          if (await onAdd()) setAdded(true);
        })
      }
    >
      <FolderInput aria-hidden />
      {added ? 'Versée au dossier' : pending ? 'Versement…' : 'Verser au dossier'}
    </Button>
  );
}

// Ce qu'en disent déjà les vérificateurs de faits, et Wikipédia. Leur conclusion est relayée sous
// leur nom, mot pour mot : elle n'est jamais réécrite. La personne choisit ce qu'elle verse.
export function FactCheckPanel({ caseId }: { caseId: string }) {
  const [result, setResult] = useState<FactCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function search() {
    setError(null);
    startTransition(async () => {
      const response = await searchFactChecks(caseId);
      if (response.ok) setResult(response.data);
      else setError(response.error.message);
    });
  }

  async function add(input: Parameters<typeof addReferenceToCase>[0]) {
    const response = await addReferenceToCase(input);
    if (!response.ok) {
      toast.error(response.error.message);
      return false;
    }
    toast.success('Pièce versée au dossier');
    return true;
  }

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-xl">
          <ShieldCheck aria-hidden className="size-5 text-primary" />
          Déjà vérifiée ailleurs ?
        </CardTitle>
        <Button variant={result ? 'outline' : 'default'} onClick={search} disabled={pending}>
          {pending && <LoaderCircle aria-hidden className="animate-spin" />}
          {result ? 'Relancer la recherche' : 'Chercher chez les vérificateurs'}
        </Button>
      </CardHeader>
      <CardContent className="grid gap-5">
        {!result && !pending && !error && (
          <p className="text-muted-foreground text-pretty">
            Les rubriques de vérification (AFP Factuel, Africa Check, Les Observateurs…) ont
            peut-être déjà traité cette information. Wikipédia donne le contexte, en français, en
            malgache et en anglais.
          </p>
        )}
        {error && <p className="text-danger">{error}</p>}
        {result && !result.searched && (
          <p className="text-muted-foreground">
            Recherche impossible pour le moment (pas de réseau). Réessayez plus tard.
          </p>
        )}

        {result?.searched && (
          <section className="grid gap-3">
            <h3 className="font-semibold">Vérificateurs de faits</h3>
            {result.factChecks.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Aucune vérification publiée trouvée. Cela ne prouve rien : le sujet est peut-être
                trop récent ou trop local.
              </p>
            ) : (
              <ul className="grid gap-3">
                {result.factChecks.map((check) => (
                  <li key={check.url} className="grid gap-1.5 rounded-xl bg-muted/50 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{check.publisher}</span>
                      {check.rating && <ToneBadge tone="info">« {check.rating} »</ToneBadge>}
                      {dateOf(check.published_at) && (
                        <span className="text-muted-foreground text-sm">
                          {formatDate(dateOf(check.published_at))}
                        </span>
                      )}
                    </div>
                    <a
                      href={check.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                    >
                      {check.title || check.url}
                      <ExternalLink aria-hidden className="size-3.5" />
                    </a>
                    {check.claim && (
                      <p className="text-sm">Affirmation vérifiée : « {check.claim} »</p>
                    )}
                    {check.excerpt && (
                      <p className="text-muted-foreground text-sm line-clamp-3">{check.excerpt}</p>
                    )}
                    <div>
                      <AddButton
                        onAdd={() =>
                          add({
                            caseId,
                            kind: 'fact_check',
                            url: check.url,
                            title: check.title || 'Vérification publiée',
                            content: check.rating
                              ? `${check.publisher} conclut : « ${check.rating} ».${check.claim ? ` Affirmation vérifiée : « ${check.claim} ».` : ''}`
                              : check.excerpt || check.title,
                            sourceName: check.publisher,
                            publishedAt: check.published_at,
                          })
                        }
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {result?.searched && result.wikipedia.length > 0 && (
          <section className="grid gap-3">
            <h3 className="flex items-center gap-2 font-semibold">
              <BookOpen aria-hidden className="size-4" />
              Wikipédia
            </h3>
            <ul className="grid gap-3">
              {result.wikipedia.map((article) => (
                <li key={article.url} className="grid gap-1.5 rounded-xl bg-muted/50 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
                    >
                      {article.title}
                      <ExternalLink aria-hidden className="size-3.5" />
                    </a>
                    <ToneBadge>{LANGUAGE_LABELS[article.language] ?? article.language}</ToneBadge>
                  </div>
                  <p className="text-muted-foreground text-sm line-clamp-3">{article.summary}</p>
                  <div>
                    <AddButton
                      onAdd={() =>
                        add({
                          caseId,
                          kind: 'wikipedia',
                          url: article.url,
                          title: `Wikipédia · ${article.title}`,
                          content: article.summary.slice(0, 1500) || article.title,
                          sourceName: 'Wikipédia',
                          publishedAt: null,
                        })
                      }
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
