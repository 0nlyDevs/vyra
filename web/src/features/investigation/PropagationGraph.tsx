'use client';

import { ArrowLeftRight, MousePointerClick } from 'lucide-react';
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { ToneBadge } from '@/components/common/ToneBadge';
import { Button } from '@/components/ui/button';
import {
  CHANGE_TYPE_LABELS,
  CHANGE_TYPE_TONES,
  LINK_CONFIDENCE_LABELS,
  type LinkConfidence,
  type Tone,
} from '@/lib/domain';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { CaseFile } from '@/server/dal/cases';
import styles from './graph.module.css';
import { layoutWeb, WEB } from './graph-layout';
import { guessChange } from './guess-change';
import { type ShownLink, SourceKindBadge, VersionComparison, VersionDetail } from './VersionPanels';

type Version = CaseFile['versions'][number];
type Link = CaseFile['links'][number];

type Selection = { kind: 'version'; id: string } | { kind: 'compare'; id: string } | null;

// Traits du lien selon la confiance : plein (forte), tirets (moyenne), pointillés (faible).
const CONFIDENCE_DASH = {
  high: undefined,
  medium: '9 7',
  low: '2 7',
} satisfies Record<LinkConfidence, string | undefined>;

const TONE_STROKE = {
  success: 'var(--color-success)',
  info: 'var(--color-info)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
  neutral: 'var(--color-muted-foreground)',
} satisfies Record<Tone, string>;

// L'information analysée : la version qui porte le texte de l'affaire, sinon la plus récente.
function findCenter(versions: Version[], claim: string) {
  const plain = (text: string) => text.replace(/\s+/g, ' ').trim();
  return (
    versions.find((version) => plain(version.content) === plain(claim)) ??
    [...versions].sort((a, b) => b.position - a.position)[0]
  );
}

// Le lien d'une source avec l'information analysée : celui enregistré (par l'IA ou l'équipe),
// sinon une estimation sans IA, d'après les mots ajoutés et retirés.
function linkToCenter(version: Version, center: Version, links: Link[]): ShownLink {
  const saved = links.find(
    (link) =>
      (link.fromVersionId === version.id && link.toVersionId === center.id) ||
      (link.fromVersionId === center.id && link.toVersionId === version.id),
  );
  if (saved) return { ...saved, estimated: false };
  return { ...guessChange(version.content, center.content), estimated: true };
}

// La toile d'une affaire : l'information analysée au centre, chaque source retrouvée autour,
// reliée au centre par ce qu'elle dit par rapport à elle.
export function PropagationGraph({
  versions,
  links,
  claim,
}: {
  versions: Version[];
  links: Link[];
  claim: string;
}) {
  const [selection, setSelection] = useState<Selection>(null);
  const [available, setAvailable] = useState<number | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  // La largeur disponible décide de la taille de la toile : tout doit tenir dans l'écran.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setAvailable(entry.contentRect.width);
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  const center = findCenter(versions, claim);
  if (!center) return null;
  const layout = layoutWeb(versions, center.id, available);
  const versionById = new Map(versions.map((version) => [version.id, version]));
  const shown = new Map(
    layout.nodes.flatMap((node) => {
      const version = versionById.get(node.id);
      return version ? [[node.id, linkToCenter(version, center, links)] as const] : [];
    }),
  );
  const oldest = layout.nodes[0];

  const compared = selection?.kind === 'compare' ? versionById.get(selection.id) : undefined;
  const detailed = selection?.kind === 'version' ? versionById.get(selection.id) : undefined;
  const isSelected = (id: string) =>
    selection?.id === id || (selection?.kind === 'compare' && id === center.id);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <GraphLegend />
        {oldest && (
          <Button
            variant="outline"
            onClick={() => setSelection({ kind: 'compare', id: oldest.id })}
          >
            <ArrowLeftRight aria-hidden />
            Comparer avec la plus ancienne retrouvée
          </Button>
        )}
      </div>

      <div ref={frameRef} className="overflow-x-auto pb-2">
        {/* `isolate` : les étiquettes restent sous l'en-tête de la page quand on fait défiler. */}
        <figure
          className="relative isolate mx-auto"
          style={{ width: layout.width, height: layout.height }}
        >
          <figcaption className="sr-only">
            Toile des sources retrouvées, chacune reliée à l’information analysée au centre
          </figcaption>
          <svg
            className="absolute inset-0 overflow-visible"
            width={layout.width}
            height={layout.height}
            aria-hidden
          >
            {layout.edges.map((edge, index) => {
              const link = shown.get(edge.nodeId);
              if (!link) return null;
              const stroke = TONE_STROKE[CHANGE_TYPE_TONES[link.changeType]];
              const active = selection?.kind === 'compare' && selection.id === edge.nodeId;
              return (
                <line
                  key={edge.nodeId}
                  className={styles.edge}
                  style={{ '--step': index + 1 } as CSSProperties}
                  x1={edge.x1}
                  y1={edge.y1}
                  x2={edge.x2}
                  y2={edge.y2}
                  stroke={stroke}
                  strokeWidth={active ? 4 : 2.5}
                  strokeDasharray={CONFIDENCE_DASH[link.confidence]}
                  strokeLinecap="round"
                />
              );
            })}
          </svg>

          {/* Le centre : l'information analysée. */}
          <button
            type="button"
            onClick={() => setSelection({ kind: 'version', id: center.id })}
            aria-pressed={isSelected(center.id)}
            aria-label={`Information analysée, ${formatDate(center.publishedAt)}`}
            className={cn(
              styles.reveal,
              'absolute z-10 grid place-items-center rounded-full border-4 px-2 text-center font-semibold text-xs leading-tight shadow-md outline-none transition-transform duration-200',
              'hover:scale-105 active:scale-95 focus-visible:ring-[3px] focus-visible:ring-ring/50',
              isSelected(center.id)
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-primary bg-card text-primary',
            )}
            style={{
              left: layout.center.x - WEB.centerRadius,
              top: layout.center.y - WEB.centerRadius,
              width: WEB.centerRadius * 2,
              height: WEB.centerRadius * 2,
            }}
          >
            Information analysée
          </button>

          {layout.nodes.map((node) => {
            const version = versionById.get(node.id);
            if (!version) return null;
            const selected = isSelected(version.id);
            const isOldest = node.id === oldest?.id;
            return (
              <button
                key={node.id}
                type="button"
                onClick={() => setSelection({ kind: 'version', id: version.id })}
                aria-pressed={selected}
                className={cn(
                  styles.reveal,
                  'group absolute flex flex-col items-center gap-1.5 rounded-xl p-1 text-center outline-none',
                  'focus-visible:ring-[3px] focus-visible:ring-ring/50',
                  node.labelAbove && 'flex-col-reverse',
                )}
                style={
                  {
                    '--step': node.order + 1,
                    left: node.cx - WEB.labelWidth / 2,
                    top: node.labelAbove
                      ? node.cy + WEB.nodeRadius - WEB.labelHeight - WEB.nodeRadius * 2
                      : node.cy - WEB.nodeRadius,
                    width: WEB.labelWidth,
                    height: WEB.labelHeight + WEB.nodeRadius * 2,
                    justifyContent: node.labelAbove ? 'flex-start' : undefined,
                  } as CSSProperties
                }
              >
                <span
                  className={cn(
                    'grid shrink-0 place-items-center rounded-full border-2 font-semibold tabular-nums shadow-sm transition-[background-color,border-color,color,transform] duration-200',
                    'group-hover:scale-105 group-active:scale-95',
                    selected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-foreground group-hover:border-primary/60',
                  )}
                  style={{ width: WEB.nodeRadius * 2, height: WEB.nodeRadius * 2 }}
                >
                  {version.position}
                </span>
                <span className="grid gap-0.5">
                  <span className="font-semibold text-sm tabular-nums">
                    {formatDate(version.publishedAt)}
                  </span>
                  <span className="line-clamp-1 text-muted-foreground text-xs">
                    {version.sourceName}
                  </span>
                  <span className="flex flex-wrap justify-center gap-1">
                    <SourceKindBadge version={version} />
                  </span>
                  {isOldest && (
                    <span className="font-medium text-primary text-xs">
                      Plus ancienne retrouvée
                    </span>
                  )}
                </span>
              </button>
            );
          })}

          {layout.edges.map((edge, index) => {
            const link = shown.get(edge.nodeId);
            const version = versionById.get(edge.nodeId);
            if (!link || !version) return null;
            const active = selection?.kind === 'compare' && selection.id === edge.nodeId;
            return (
              <button
                key={edge.nodeId}
                type="button"
                onClick={() => setSelection({ kind: 'compare', id: edge.nodeId })}
                aria-pressed={active}
                aria-label={`Comparer la version ${version.position} à l’information analysée : ${CHANGE_TYPE_LABELS[link.changeType]}, confiance ${LINK_CONFIDENCE_LABELS[link.confidence].toLowerCase()}`}
                className={cn(
                  styles.edge,
                  'absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full outline-none transition-transform duration-150',
                  'hover:scale-105 active:scale-95 focus-visible:ring-[3px] focus-visible:ring-ring/50',
                  active && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                )}
                style={
                  {
                    '--step': index + 1,
                    left: edge.chip.x,
                    top: edge.chip.y,
                    maxWidth: 132,
                  } as CSSProperties
                }
              >
                <ToneBadge
                  tone={CHANGE_TYPE_TONES[link.changeType]}
                  className="whitespace-normal text-balance py-1 text-center leading-tight shadow-sm"
                >
                  {CHANGE_TYPE_LABELS[link.changeType]}
                </ToneBadge>
              </button>
            );
          })}
        </figure>
      </div>

      <p className="text-muted-foreground text-sm">
        Seules les sources retrouvées sont affichées. D’autres peuvent exister.
      </p>

      {compared ? (
        <VersionComparison before={compared} after={center} link={shown.get(compared.id) ?? null} />
      ) : detailed ? (
        <VersionDetail version={detailed} />
      ) : (
        <p className="flex items-center gap-2 rounded-lg border border-dashed px-4 py-5 text-muted-foreground">
          <MousePointerClick className="size-5 shrink-0" aria-hidden />
          Cliquez sur une source pour la lire, ou sur un lien pour la comparer à l’information
          analysée.
        </p>
      )}
    </div>
  );
}

function GraphLegend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-muted-foreground text-sm">
      {(['high', 'medium', 'low'] as const).map((confidence) => (
        <li key={confidence} className="flex items-center gap-2">
          <svg width="32" height="8" aria-hidden>
            <line
              x1="2"
              y1="4"
              x2="30"
              y2="4"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={CONFIDENCE_DASH[confidence]}
            />
          </svg>
          Confiance {LINK_CONFIDENCE_LABELS[confidence].toLowerCase()}
        </li>
      ))}
    </ul>
  );
}
