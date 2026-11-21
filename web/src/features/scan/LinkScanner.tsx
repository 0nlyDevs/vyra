'use client';

import { CalendarClock, ExternalLink, FileText, Link2, ShieldCheck, Waypoints } from 'lucide-react';
import { type FormEvent, useState, useTransition } from 'react';
import { AiSourceBadge } from '@/components/common/DomainBadges';
import { ToneBadge } from '@/components/common/ToneBadge';
import { FormMessage } from '@/components/form/FormField';
import { LoadingState } from '@/components/states/States';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { WarningSigns } from '@/features/signals/WarningSigns';
import { formatDate } from '@/lib/format';
import { analyzeLink, type LinkView, openCaseFromLink } from './link-actions';
import { OLD_CONTENT_DAYS } from './schema';

function Age({ view }: { view: LinkView }) {
  if (!view.publishedAt || view.daysOld === null) {
    return (
      <p className="text-muted-foreground text-sm">
        Date de publication introuvable : vérifiez-la sur la page elle-même.
      </p>
    );
  }
  const old = view.daysOld > OLD_CONTENT_DAYS;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ToneBadge tone={old ? 'warning' : 'neutral'}>
        <CalendarClock aria-hidden />
        Publié le {formatDate(new Date(view.publishedAt))}
      </ToneBadge>
      {old && (
        <span className="text-sm text-warning">
          Il y a {view.daysOld} jours : une vieille publication qui circule de nouveau est un piège
          courant.
        </span>
      )}
    </div>
  );
}

function LinkResult({ view }: { view: LinkView }) {
  return (
    <div className="grid gap-4" aria-live="polite">
      <section className="grid gap-2 surface p-4">
        <p className="text-muted-foreground text-sm">{view.site}</p>
        {view.title && <h3 className="font-semibold text-lg text-pretty">{view.title}</h3>}
        <Age view={view} />
        <a
          href={view.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary text-sm underline-offset-4 hover:underline"
        >
          Ouvrir la page
          <ExternalLink aria-hidden className="size-3.5" />
        </a>
      </section>

      <section className="grid gap-2 surface p-4">
        <h3 className="flex items-center gap-2 font-semibold">
          <FileText aria-hidden className="size-5 text-primary" />
          Ce que la page affirme
        </h3>
        {view.mainClaim && <p className="text-pretty">{view.mainClaim}</p>}
        {view.claims.length > 0 ? (
          <ul className="grid list-disc gap-1 pl-5 text-sm">
            {view.claims.map((claim) => (
              <li key={claim}>« {claim} »</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">
            Aucune phrase vérifiable relevée mot pour mot dans la page.
          </p>
        )}
        <AiSourceBadge source={view.aiSource} />
      </section>

      <WarningSigns text={view.text} title="Signes d’alerte dans la page" />

      <section className="grid gap-2 surface p-4">
        <h3 className="flex items-center gap-2 font-semibold">
          <ShieldCheck aria-hidden className="size-5 text-primary" />
          Déjà vérifiée ailleurs ?
        </h3>
        {!view.searched ? (
          <p className="text-muted-foreground text-sm">Recherche impossible pour le moment.</p>
        ) : view.factChecks.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Aucune vérification publiée trouvée. Cela ne prouve rien.
          </p>
        ) : (
          <ul className="grid gap-2">
            {view.factChecks.map((check) => (
              <li key={check.url} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{check.publisher}</span>
                {check.rating && <ToneBadge tone="info">« {check.rating} »</ToneBadge>}
                <a
                  href={check.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {check.title || 'Lire la vérification'}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {view.mainClaim.length >= 15 && (
        <form action={openCaseFromLink}>
          <input type="hidden" name="claim" value={view.mainClaim} />
          <input type="hidden" name="url" value={view.url} />
          <Button type="submit">
            <Waypoints aria-hidden />
            Ouvrir l’enquête sur cette information
          </Button>
        </form>
      )}
    </div>
  );
}

// Analyse d'un lien reçu : ce que la page affirme, son âge, son ton, et ce qu'en disent déjà les
// vérificateurs. Jamais de verdict : l'enquête et le tribunal concluent.
export function LinkScanner() {
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [askText, setAskText] = useState(false);
  const [view, setView] = useState<LinkView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setView(null);
    startTransition(async () => {
      const result = await analyzeLink({ url, text });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      if (result.data.needsText) {
        setAskText(true);
        return;
      }
      setView(result.data);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={submit} className="grid content-start gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="link-url">Lien reçu</Label>
          <Input
            id="link-url"
            type="url"
            required
            placeholder="https://…"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
        </div>
        {askText && (
          <div className="grid gap-1.5">
            <Label htmlFor="link-text">Texte de la publication</Label>
            <p className="text-muted-foreground text-sm">
              Cette page ne se lit pas de l’extérieur (Facebook, TikTok, site protégé…). Collez ici
              le texte de la publication.
            </p>
            <Textarea
              id="link-text"
              rows={5}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </div>
        )}
        <Button type="submit" disabled={pending} className="justify-self-start">
          <Link2 aria-hidden />
          {pending ? 'Lecture du lien…' : 'Analyser le lien'}
        </Button>
        <FormMessage message={error} />
      </form>

      <div className="grid content-start gap-4">
        {pending && <LoadingState title="Lecture de la page, puis recherche…" />}
        {view && !pending && <LinkResult view={view} />}
        {!view && !pending && (
          <p className="rounded-xl border border-dashed p-6 text-muted-foreground">
            Collez le lien d’un article ou d’une publication : ce qu’il affirme, sa date, son ton,
            et si des vérificateurs l’ont déjà traité. Le scan relève des indices, il ne rend jamais
            de verdict.
          </p>
        )}
      </div>
    </div>
  );
}
