'use client';

import { ArrowLeftRight, MousePointerClick } from 'lucide-react';
import { type CSSProperties, useState } from 'react';
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
import { GRAPH, layoutGraph } from './graph-layout';
import { VersionComparison, VersionDetail } from './VersionPanels';

type Version = CaseFile['versions'][number];
type Link = CaseFile['links'][number];

type Selection =
  | { kind: 'version'; id: string }
  | { kind: 'compare'; fromId: string; toId: string; linkId: string | null }
  | null;

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

export function PropagationGraph({ versions, links }: { versions: Version[]; links: Link[] }) {
  const [selection, setSelection] = useState<Selection>(null);
  const layout = layoutGraph(versions, links);
  const versionById = new Map(versions.map((version) => [version.id, version]));
  const oldest = layout.nodes[0];
  const newest = layout.nodes.at(-1);

  const selectedVersionIds = new Set(
    selection?.kind === 'version'
      ? [selection.id]
      : selection?.kind === 'compare'
        ? [selection.fromId, selection.toId]
        : [],
  );

  function compareOldestAndNewest() {
    if (oldest && newest && oldest.id !== newest.id) {
      setSelection({ kind: 'compare', fromId: oldest.id, toId: newest.id, linkId: null });
    }
  }

  const compared =
    selection?.kind === 'compare'
      ? {
          before: versionById.get(selection.fromId),
          after: versionById.get(selection.toId),
          link: links.find((link) => link.id === selection.linkId) ?? null,
        }
      : null;
  const detailed = selection?.kind === 'version' ? versionById.get(selection.id) : undefined;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <GraphLegend />
        {versions.length > 1 && (
          <Button variant="outline" onClick={compareOldestAndNewest}>
            <ArrowLeftRight aria-hidden />
            Comparer la plus ancienne et la plus récente
          </Button>
        )}
      </div>

      <div className="-mx-2 overflow-x-auto px-2 pb-2">
        <div
          className="relative mx-auto"
          style={{ width: layout.width, height: layout.height }}
          role="group"
          aria-label="Graphe des versions retrouvées, de la plus ancienne à la plus récente"
        >
          <svg
            className="absolute inset-0 overflow-visible"
            width={layout.width}
            height={layout.height}
            aria-hidden
          >
            {layout.edges.map((edge) => {
              const link = links.find((item) => item.id === edge.id);
              if (!link) return null;
              const stroke = TONE_STROKE[CHANGE_TYPE_TONES[link.changeType]];
              const active = selection?.kind === 'compare' && selection.linkId === link.id;
              return (
                <g
                  key={edge.id}
                  className={styles.edge}
                  style={{ '--step': edge.column } as CSSProperties}
                >
                  <path
                    d={edge.path}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={active ? 4 : 2.5}
                    strokeDasharray={CONFIDENCE_DASH[link.confidence]}
                    strokeLinecap="round"
                  />
                  <polygon points={edge.arrow} fill={stroke} />
                </g>
              );
            })}
          </svg>

          {layout.nodes.map((node) => {
            const version = versionById.get(node.id);
            if (!version) return null;
            const selected = selectedVersionIds.has(version.id);
            const isOldest = node.id === oldest?.id;
            return (
              <button
                key={node.id}
                type="button"
                onClick={() => setSelection({ kind: 'version', id: version.id })}
                aria-pressed={selected}
                className={cn(
                  styles.reveal,
                  'group absolute grid justify-items-center gap-2 rounded-xl p-1 text-center outline-none',
                  'focus-visible:ring-[3px] focus-visible:ring-ring/50',
                )}
                style={
                  {
                    '--step': node.column,
                    left: node.cx - GRAPH.labelWidth / 2,
                    top: node.cy - GRAPH.radius,
                    width: GRAPH.labelWidth,
                  } as CSSProperties
                }
              >
                <span
                  className={cn(
                    'grid place-items-center rounded-full border-2 font-semibold text-lg tabular-nums shadow-sm transition-[background-color,border-color,color,transform] duration-200',
                    'group-hover:scale-105 group-active:scale-95',
                    selected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : isOldest
                        ? 'border-primary bg-card text-primary'
                        : 'border-border bg-card text-foreground group-hover:border-primary/60',
                  )}
                  style={{ width: GRAPH.radius * 2, height: GRAPH.radius * 2 }}
                >
                  {version.position}
                </span>
                <span className="grid gap-0.5">
                  <span className="font-semibold text-sm tabular-nums">
                    {formatDate(version.publishedAt)}
                  </span>
                  <span className="line-clamp-2 text-muted-foreground text-xs">
                    {version.sourceName}
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

          {layout.edges.map((edge) => {
            const link = links.find((item) => item.id === edge.id);
            if (!link) return null;
            const active = selection?.kind === 'compare' && selection.linkId === link.id;
            const from = versionById.get(link.fromVersionId);
            const to = versionById.get(link.toVersionId);
            return (
              <button
                key={edge.id}
                type="button"
                onClick={() =>
                  setSelection({
                    kind: 'compare',
                    fromId: link.fromVersionId,
                    toId: link.toVersionId,
                    linkId: link.id,
                  })
                }
                aria-pressed={active}
                aria-label={`Comparer les versions ${from?.position} et ${to?.position} : ${CHANGE_TYPE_LABELS[link.changeType]}, confiance ${LINK_CONFIDENCE_LABELS[link.confidence].toLowerCase()}`}
                className={cn(
                  styles.edge,
                  'absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full outline-none transition-transform duration-150',
                  'hover:scale-105 active:scale-95 focus-visible:ring-[3px] focus-visible:ring-ring/50',
                  active && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                )}
                style={
                  {
                    '--step': edge.column,
                    left: edge.middle.x,
                    top: edge.middle.y,
                    maxWidth: GRAPH.columnWidth - GRAPH.radius * 2 - 20,
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
        </div>
      </div>

      <p className="text-muted-foreground text-sm">
        Seules les versions retrouvées sont affichées. D’autres peuvent exister.
      </p>

      {compared?.before && compared.after ? (
        <VersionComparison
          before={compared.before}
          after={compared.after}
          link={compared.link}
        />
      ) : detailed ? (
        <VersionDetail version={detailed} />
      ) : (
        <p className="flex items-center gap-2 rounded-lg border border-dashed px-4 py-5 text-muted-foreground">
          <MousePointerClick className="size-5 shrink-0" aria-hidden />
          Cliquez sur une version pour la lire, ou sur un lien pour comparer les deux versions.
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
