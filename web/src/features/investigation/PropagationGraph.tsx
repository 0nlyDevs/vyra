'use client';

import { ArrowLeftRight, MousePointerClick, TriangleAlert } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import type { CaseFile } from '@/server/dal/cases';
import { formatDay as formatDate } from './dates';
import { ExploreButton } from './ExploreButton';
import { ExploreLevelButton } from './ExploreLevelButton';
import styles from './graph.module.css';
import { DISTORTING_TYPES, layoutTree, pathTo, TREE } from './graph-layout';
import { SourceKindBadge, VersionComparison, VersionDetail } from './VersionPanels';

type Version = CaseFile['versions'][number];
type Link = CaseFile['links'][number];

type Selection =
  | { kind: 'version'; id: string }
  | { kind: 'compare'; leftId: string; rightId: string; linkId: string | null }
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

// L'information analysée : la version qui porte le texte de l'affaire, sinon la plus récente.
function findCenter(versions: Version[], claim: string) {
  const plain = (text: string) => text.replace(/\s+/g, ' ').trim();
  return (
    versions.find((version) => plain(version.content) === plain(claim)) ??
    [...versions].sort((a, b) => b.position - a.position)[0]
  );
}

// L'arbre de propagation d'une affaire : qui a publié en premier, qui a repris qui, où
// l'information a été déformée, et où elle a été démentie.
export function PropagationGraph({
  caseId,
  versions,
  links,
  claim,
  explored,
  frontier,
}: {
  caseId: string;
  versions: Version[];
  links: Link[];
  claim: string;
  // Sources en bout de branche pas encore explorées (bouton « Explorer un niveau de plus »).
  frontier: number;
  // Sources déjà explorées, avec le nombre de reprises ajoutées : pas de seconde exploration.
  explored: { versionId: string; addedCount: number }[];
}) {
  const [selection, setSelection] = useState<Selection>(null);
  const [showContext, setShowContext] = useState(false);
  const [available, setAvailable] = useState<number | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  // La largeur disponible décide de l'écart entre les générations : tout l'arbre doit tenir.
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

  // Le contexte (« même sujet, autre fait ») d'un grand arbre est replié par défaut : il noierait
  // le chemin de l'information. Un bouton l'affiche.
  const contextIds = new Set(
    links.filter((link) => link.changeType === 'related').map((link) => link.fromVersionId),
  );
  const foldable = versions.length > TREE.compactFrom && contextIds.size > 0;
  const hidden = foldable && !showContext ? contextIds : new Set<string>();
  const shownVersions = versions.filter((version) => !hidden.has(version.id));
  const shownLinks = links.filter(
    (link) => !hidden.has(link.fromVersionId) && !hidden.has(link.toVersionId),
  );
  const layout = layoutTree(shownVersions, shownLinks, center.id, available);
  const versionById = new Map(versions.map((version) => [version.id, version]));
  const nodeById = new Map(layout.nodes.map((node) => [node.id, node]));
  // Grand arbre : étiquettes un peu plus étroites que leur case, pour ne pas se toucher.
  const labelWidth = layout.compact ? 140 : TREE.labelWidth;

  // Le chemin de la plus ancienne source à l'information analysée, et sur ce chemin le premier
  // lien qui déforme l'information : le point de déformation.
  const path = pathTo(center.id, layout.parentOf);
  const root = versionById.get(path[0] ?? '');
  const onPath = new Set(path.slice(1).map((id, index) => `${path[index]}>${id}`));
  const deformation = path
    .slice(1)
    .map((id, index) =>
      links.find((link) => link.fromVersionId === path[index] && link.toVersionId === id),
    )
    .find((link) => link && DISTORTING_TYPES.includes(link.changeType));
  const deformedVersion = deformation ? versionById.get(deformation.toVersionId) : undefined;

  const selectedIds = new Set(
    selection?.kind === 'version'
      ? [selection.id]
      : selection?.kind === 'compare'
        ? [selection.leftId, selection.rightId]
        : [],
  );
  const compared =
    selection?.kind === 'compare'
      ? {
          before: versionById.get(selection.leftId),
          after: versionById.get(selection.rightId),
          link: links.find((link) => link.id === selection.linkId) ?? null,
        }
      : null;
  const detailed = selection?.kind === 'version' ? versionById.get(selection.id) : undefined;

  return (
    <div className="grid gap-6">
      {deformation && deformedVersion && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/40 bg-danger-soft px-4 py-3 text-danger">
          <p className="flex items-start gap-2">
            <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
            <span>
              <strong className="font-semibold">La déformation apparaît ici :</strong>{' '}
              {deformedVersion.sourceName}, le {formatDate(deformedVersion.publishedAt)}.{' '}
              <span className="text-foreground">{deformation.note}</span>
            </span>
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setSelection({
                kind: 'compare',
                leftId: deformation.fromVersionId,
                rightId: deformation.toVersionId,
                linkId: deformation.id,
              })
            }
          >
            Voir ce qui change
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <ExploreLevelButton caseId={caseId} frontier={frontier} />
        {foldable && (
          <Button variant="outline" onClick={() => setShowContext((value) => !value)}>
            {showContext
              ? 'Masquer le contexte'
              : `Afficher le contexte (${contextIds.size} sources : même sujet, autre fait)`}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <GraphLegend />
        {root && root.id !== center.id && (
          <Button
            variant="outline"
            onClick={() =>
              setSelection({ kind: 'compare', leftId: root.id, rightId: center.id, linkId: null })
            }
          >
            <ArrowLeftRight aria-hidden />
            Comparer la plus ancienne et l’information analysée
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
            Arbre de propagation : la source la plus ancienne à gauche, puis les reprises, jusqu’à
            l’information analysée
          </figcaption>
          <svg
            className="absolute inset-0 overflow-visible"
            width={layout.width}
            height={layout.height}
            aria-hidden
          >
            {layout.edges.map((edge) => {
              const isDeformation = edge.link === deformation;
              const stroke = isDeformation
                ? 'var(--color-danger)'
                : TONE_STROKE[CHANGE_TYPE_TONES[edge.link.changeType]];
              const active =
                selection?.kind === 'compare' &&
                selection.leftId === edge.leftId &&
                selection.rightId === edge.rightId;
              const linkConfidence = links.find((link) => link === edge.link)?.confidence ?? 'low';
              const main = onPath.has(`${edge.leftId}>${edge.rightId}`);
              return (
                <path
                  key={edge.key}
                  className={styles.edge}
                  style={{ '--step': nodeById.get(edge.rightId)?.depth ?? 1 } as CSSProperties}
                  d={edge.path}
                  fill="none"
                  stroke={stroke}
                  strokeOpacity={main || isDeformation ? 1 : 0.75}
                  strokeWidth={isDeformation ? 5 : active ? 4 : main ? 3 : 2}
                  strokeDasharray={CONFIDENCE_DASH[linkConfidence]}
                  strokeLinecap="round"
                />
              );
            })}
          </svg>

          {layout.nodes.map((node) => {
            const version = versionById.get(node.id);
            if (!version) return null;
            const isCenter = version.id === center.id;
            const isRoot = version.id === root?.id && !isCenter;
            const selected = selectedIds.has(version.id);
            const radius = isCenter ? TREE.centerRadius : TREE.nodeRadius;
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
                )}
                style={
                  {
                    '--step': node.depth,
                    left: node.cx - labelWidth / 2,
                    top: node.cy - radius,
                    width: labelWidth,
                  } as CSSProperties
                }
              >
                <span
                  className={cn(
                    'grid shrink-0 place-items-center rounded-full font-semibold tabular-nums shadow-sm transition-[background-color,border-color,color,transform] duration-200',
                    'group-hover:scale-105 group-active:scale-95',
                    isCenter ? 'border-4' : 'border-2',
                    selected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : isCenter || isRoot
                        ? 'border-primary bg-card text-primary'
                        : 'border-border bg-card text-foreground group-hover:border-primary/60',
                  )}
                  style={{ width: radius * 2, height: radius * 2 }}
                >
                  {version.position}
                </span>
                <span className="grid gap-0.5">
                  {isCenter && (
                    <span className="font-semibold text-primary text-xs">Information analysée</span>
                  )}
                  <span
                    className={cn(
                      'font-semibold tabular-nums',
                      layout.compact ? 'text-xs' : 'text-sm',
                    )}
                  >
                    {formatDate(version.publishedAt)}
                  </span>
                  <span className="line-clamp-1 text-muted-foreground text-xs">
                    {version.sourceName}
                  </span>
                  <span className="flex flex-wrap justify-center gap-1">
                    <SourceKindBadge version={version} />
                  </span>
                  {isRoot && !layout.compact && (
                    <span className="font-medium text-primary text-xs">
                      Plus ancienne retrouvée
                    </span>
                  )}
                </span>
              </button>
            );
          })}

          {layout.edges.map((edge) => {
            const isDeformation = edge.link === deformation;
            const link = links.find((item) => item === edge.link);
            if (!link) return null;
            const active =
              selection?.kind === 'compare' &&
              selection.leftId === edge.leftId &&
              selection.rightId === edge.rightId;
            // Grand arbre : seules les étiquettes qui racontent l'histoire restent (chemin vers
            // l'information, déformation, démentis, lien choisi) ; les autres liens gardent leur
            // couleur et se cliquent quand même.
            const important =
              !layout.compact ||
              isDeformation ||
              active ||
              link.changeType === 'contradicts' ||
              onPath.has(`${edge.leftId}>${edge.rightId}`);
            if (!important) return null;
            const left = versionById.get(edge.leftId);
            const right = versionById.get(edge.rightId);
            return (
              <button
                key={edge.key}
                type="button"
                onClick={() =>
                  setSelection({
                    kind: 'compare',
                    leftId: edge.leftId,
                    rightId: edge.rightId,
                    linkId: link.id,
                  })
                }
                aria-pressed={active}
                aria-label={`Comparer les versions ${left?.position} et ${right?.position} : ${CHANGE_TYPE_LABELS[link.changeType]}, confiance ${LINK_CONFIDENCE_LABELS[link.confidence].toLowerCase()}`}
                className={cn(
                  styles.edge,
                  'absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full outline-none transition-transform duration-150',
                  'hover:scale-105 active:scale-95 focus-visible:ring-[3px] focus-visible:ring-ring/50',
                  active && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                )}
                style={
                  {
                    '--step': nodeById.get(edge.rightId)?.depth ?? 1,
                    left: edge.chip.x,
                    top: edge.chip.y,
                    maxWidth: Math.max(96, layout.columnWidth - TREE.nodeRadius * 2 - 24),
                  } as CSSProperties
                }
              >
                <ToneBadge
                  tone={isDeformation ? 'danger' : CHANGE_TYPE_TONES[link.changeType]}
                  className={cn(
                    'whitespace-normal text-balance py-1 text-center leading-tight shadow-sm',
                    isDeformation && 'ring-2 ring-danger',
                  )}
                >
                  {isDeformation && <TriangleAlert aria-hidden />}
                  {CHANGE_TYPE_LABELS[link.changeType]}
                </ToneBadge>
              </button>
            );
          })}
        </figure>
      </div>

      <p className="text-muted-foreground text-sm">
        Liens déduits des dates, des phrases reprises, des citations et des liens entre pages : «
        reprise probable », pas une certitude. Seules les sources publiques retrouvées sont
        affichées ; entre deux d’entre elles, d’autres étapes peuvent exister.
      </p>

      {compared?.before && compared.after ? (
        <VersionComparison
          before={compared.before}
          after={compared.after}
          afterIsCenter={compared.after.id === center.id}
          link={compared.link ? { ...compared.link, estimated: false } : null}
        />
      ) : detailed ? (
        <VersionDetail
          version={detailed}
          action={
            detailed.sourceUrl ? (
              <ExploreButton
                caseId={caseId}
                versionId={detailed.id}
                added={explored.find((item) => item.versionId === detailed.id)?.addedCount ?? null}
              />
            ) : undefined
          }
        />
      ) : (
        <p className="flex items-center gap-2 rounded-lg border border-dashed px-4 py-5 text-muted-foreground">
          <MousePointerClick className="size-5 shrink-0" aria-hidden />
          Cliquez sur une source pour la lire ou l’explorer, ou sur un lien pour voir ce qui change.
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
          {confidence === 'high'
            ? 'Lien ou citation'
            : confidence === 'medium'
              ? 'Phrases reprises'
              : 'Reprise possible'}
        </li>
      ))}
    </ul>
  );
}
