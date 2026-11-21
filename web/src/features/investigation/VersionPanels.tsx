import { ExternalLink } from 'lucide-react';
import { ToneBadge } from '@/components/common/ToneBadge';
import {
  CHANGE_TYPE_LABELS,
  CHANGE_TYPE_TONES,
  LINK_CONFIDENCE_LABELS,
} from '@/lib/domain';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { CaseFile } from '@/server/dal/cases';
import { type DiffPart, diffWords } from './word-diff';

type Version = CaseFile['versions'][number];
type Link = CaseFile['links'][number];

// Panneau d'une version : son texte, sa source, sa date.
export function VersionDetail({ version }: { version: Version }) {
  return (
    <section
      aria-label={`Version ${version.position}`}
      className="grid gap-3 rounded-xl border bg-card p-5 shadow-sm"
    >
      <VersionHeading version={version} />
      <blockquote className="max-w-[70ch] text-pretty text-lg leading-relaxed">
        {version.content}
      </blockquote>
      {version.sourceUrl && (
        <a
          href={version.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 justify-self-start text-primary text-sm underline underline-offset-4"
        >
          Voir la source
          <ExternalLink className="size-3.5" aria-hidden />
        </a>
      )}
    </section>
  );
}

// Deux versions côte à côte : mots retirés à gauche, mots ajoutés à droite.
export function VersionComparison({
  before,
  after,
  link,
}: {
  before: Version;
  after: Version;
  link: Link | null;
}) {
  const diff = diffWords(before.content, after.content);
  return (
    <section
      aria-label={`Comparaison des versions ${before.position} et ${after.position}`}
      className="grid gap-5 rounded-xl border bg-card p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold text-lg">
          Version {before.position} → version {after.position}
        </h3>
        <ul className="flex flex-wrap gap-4 text-sm" aria-label="Légende">
          <li className="flex items-center gap-2">
            <span className="rounded bg-muted px-1.5 text-muted-foreground line-through">
              mot
            </span>
            retiré
          </li>
          <li className="flex items-center gap-2">
            <span className="rounded bg-warning-soft px-1.5 font-medium text-warning">mot</span>
            ajouté
          </li>
        </ul>
      </div>

      {link && (
        <p className="flex flex-wrap items-center gap-2">
          <ToneBadge tone={CHANGE_TYPE_TONES[link.changeType]}>
            {CHANGE_TYPE_LABELS[link.changeType]}
          </ToneBadge>
          <span>{link.note}</span>
          <span className="text-muted-foreground text-sm">
            Confiance : {LINK_CONFIDENCE_LABELS[link.confidence].toLowerCase()}.
          </span>
        </p>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <div className="grid content-start gap-2">
          <VersionHeading version={before} />
          <DiffText parts={diff.before} />
        </div>
        <div className="grid content-start gap-2 md:border-l md:pl-5">
          <VersionHeading version={after} />
          <DiffText parts={diff.after} />
        </div>
      </div>
    </section>
  );
}

function VersionHeading({ version }: { version: Version }) {
  return (
    <p className="text-muted-foreground text-sm">
      <span className="font-semibold text-foreground">Version {version.position}</span> ·{' '}
      {version.sourceName} ·{' '}
      <time dateTime={version.publishedAt?.toISOString()}>{formatDate(version.publishedAt)}</time>
    </p>
  );
}

function DiffText({ parts }: { parts: DiffPart[] }) {
  return (
    <p className="text-pretty text-lg leading-relaxed">
      {parts.map((part, index) =>
        part.kind === 'same' ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: les morceaux n'ont pas d'identité propre.
          <span key={index}>{part.text}</span>
        ) : part.kind === 'removed' ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: les morceaux n'ont pas d'identité propre.
          <del key={index} className="rounded bg-muted px-0.5 text-muted-foreground">
            {part.text}
          </del>
        ) : (
          <ins
            // biome-ignore lint/suspicious/noArrayIndexKey: les morceaux n'ont pas d'identité propre.
            key={index}
            className={cn('rounded bg-warning-soft px-0.5 font-medium text-warning no-underline')}
          >
            {part.text}
          </ins>
        ),
      )}
    </p>
  );
}
