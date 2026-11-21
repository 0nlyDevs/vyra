import type { ChangeType, LinkConfidence } from '@/lib/domain';

// Disposition de l'arbre de propagation, lu de gauche à droite : la source la plus ancienne (la
// racine) à gauche, puis une colonne par génération de reprises. Un démenti se place à droite de
// la version qu'il dément ; le contexte, à droite de la racine.

type VersionRef = { id: string; publishedAt: Date | null };
type LinkRef = {
  id?: string;
  fromVersionId: string;
  toVersionId: string;
  changeType: ChangeType;
  confidence?: LinkConfidence;
};

export const TREE = {
  nodeRadius: 26,
  centerRadius: 34,
  // Texte sous chaque source : date, nom, type.
  labelWidth: 150,
  rowHeight: 172,
  // Au-delà de `compactFrom` sources, lignes plus serrées (étiquette réduite à l'essentiel).
  compactRowHeight: 128,
  compactFrom: 10,
  minColumnWidth: 156,
  maxColumnWidth: 300,
  defaultWidth: 900,
  top: 8,
} as const;

// Liens « à côté » de l'arbre : ils ne disent pas qui reprend qui.
const SIDE_TYPES: ChangeType[] = ['contradicts', 'related'];
// Changements qui déforment l'information : le premier sur le chemin est le point de déformation.
export const DISTORTING_TYPES: ChangeType[] = [
  'figure_changed',
  'tone_hardened',
  'passage_cut',
  'image_added',
];

export type TreeNode = { id: string; depth: number; row: number; cx: number; cy: number };
export type TreeEdge = {
  key: string;
  link: LinkRef;
  // De gauche à droite : la version reprise (ou démentie), puis celle qui la reprend (ou dément).
  leftId: string;
  rightId: string;
  path: string;
  chip: { x: number; y: number };
};

function time(date: Date | null) {
  return date ? date.getTime() : Number.MAX_SAFE_INTEGER;
}

export function isSideLink(link: LinkRef) {
  return SIDE_TYPES.includes(link.changeType);
}

// Le parent de chaque version dans l'arbre (le premier lien qui y mène, pour un graphe à plusieurs
// parents), et le côté gauche / droit de chaque lien.
function orient(link: LinkRef) {
  return isSideLink(link)
    ? { left: link.toVersionId, right: link.fromVersionId }
    : { left: link.fromVersionId, right: link.toVersionId };
}

export function primaryParents(versions: VersionRef[], links: LinkRef[]) {
  return attachments(versions, links).parentOf;
}

// Le parent de chaque version, et les versions « à côté » (démentis, contexte) : elles se placent
// sous leur cible, dans la même colonne, au lieu d'ouvrir une génération de plus.
function attachments(versions: VersionRef[], links: LinkRef[]) {
  const ids = new Set(versions.map((version) => version.id));
  const parentOf = new Map<string, string>();
  const sideIds = new Set<string>();
  // Les reprises d'abord (un démenti ne doit pas devenir le parent d'une version), et parmi elles
  // les plus sûres : un lien trouvé en explorant (une page qui cite sa source) l'emporte sur une
  // reprise seulement possible.
  const rank = { high: 0, medium: 1, low: 2 } as const;
  const ordered = [...links].sort(
    (a, b) =>
      Number(isSideLink(a)) - Number(isSideLink(b)) ||
      rank[a.confidence ?? 'low'] - rank[b.confidence ?? 'low'],
  );
  for (const link of ordered) {
    const { left, right } = orient(link);
    if (!ids.has(left) || !ids.has(right) || left === right || parentOf.has(right)) continue;
    // Pas de boucle : on refuse un parent qui descend déjà de cette version.
    let cursor: string | undefined = left;
    let loops = false;
    while (cursor) {
      if (cursor === right) {
        loops = true;
        break;
      }
      cursor = parentOf.get(cursor);
    }
    if (!loops) {
      parentOf.set(right, left);
      if (isSideLink(link)) sideIds.add(right);
    }
  }
  return { parentOf, sideIds };
}

// Le chemin de la racine à une version, en suivant les parents.
export function pathTo(id: string, parentOf: Map<string, string>) {
  const path = [id];
  let cursor = parentOf.get(id);
  while (cursor && !path.includes(cursor)) {
    path.unshift(cursor);
    cursor = parentOf.get(cursor);
  }
  return path;
}

export function layoutTree(
  versions: VersionRef[],
  links: LinkRef[],
  centerId: string,
  available: number | null,
) {
  // Grand arbre : de haut en bas, une bande par génération, sur plusieurs lignes si besoin.
  if (versions.length > TREE.compactFrom) {
    return layoutLayers(versions, links, centerId, available);
  }
  const { parentOf, sideIds } = attachments(versions, links);
  const compact = false;
  const rowHeight = TREE.rowHeight;
  const byId = new Map(versions.map((version) => [version.id, version]));
  const children = new Map<string, string[]>();
  for (const [child, parent] of parentOf) {
    children.set(parent, [...(children.get(parent) ?? []), child]);
  }
  const byDate = (a: string, b: string) =>
    time(byId.get(a)?.publishedAt ?? null) - time(byId.get(b)?.publishedAt ?? null);

  // Profondeur = génération ; lignes = feuilles dans l'ordre, un parent au milieu de ses enfants.
  // Un démenti ou un contexte prend une ligne sous sa cible, dans la même colonne.
  const depth = new Map<string, number>();
  const row = new Map<string, number>();
  let nextRow = 0;
  const place = (id: string, level: number) => {
    depth.set(id, level);
    const all = (children.get(id) ?? []).sort(byDate);
    const kids = all.filter((kid) => !sideIds.has(kid));
    if (kids.length === 0) {
      row.set(id, nextRow);
      nextRow += 1;
    } else {
      for (const kid of kids) place(kid, level + 1);
      const first = row.get(kids[0] ?? id) ?? 0;
      const last = row.get(kids.at(-1) ?? id) ?? 0;
      row.set(id, (first + last) / 2);
    }
    for (const side of all.filter((kid) => sideIds.has(kid))) place(side, level);
  };
  const roots = versions.map((version) => version.id).filter((id) => !parentOf.has(id));
  for (const root of roots.sort(byDate)) place(root, 0);

  const maxDepth = Math.max(0, ...depth.values());
  const width = Math.max(available ?? TREE.defaultWidth, TREE.labelWidth * 2);
  // Place à droite pour l'accolade d'un démenti placé dans la dernière colonne.
  const sideRoom = sideIds.size > 0 ? 70 : 0;
  const columnWidth =
    maxDepth === 0
      ? 0
      : Math.max(
          TREE.minColumnWidth,
          Math.min(TREE.maxColumnWidth, (width - TREE.labelWidth - sideRoom) / maxDepth),
        );
  const usedWidth = TREE.labelWidth + maxDepth * columnWidth + sideRoom;
  const left = Math.max(TREE.labelWidth / 2, (width - usedWidth) / 2 + TREE.labelWidth / 2);

  const nodes: TreeNode[] = versions.map((version) => {
    const level = depth.get(version.id) ?? 0;
    const line = row.get(version.id) ?? 0;
    const radius = version.id === centerId ? TREE.centerRadius : TREE.nodeRadius;
    return {
      id: version.id,
      depth: level,
      row: line,
      cx: left + level * columnWidth,
      cy: TREE.top + TREE.centerRadius + line * rowHeight + (TREE.centerRadius - radius),
    };
  });
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const radiusOf = (id: string) => (id === centerId ? TREE.centerRadius : TREE.nodeRadius);

  const edges: TreeEdge[] = links.flatMap((link, index) => {
    const { left: leftId, right: rightId } = orient(link);
    const a = nodeById.get(leftId);
    const b = nodeById.get(rightId);
    if (!a || !b) return [];
    const key = link.id ?? `${leftId}-${rightId}-${index}`;
    const ay = a.cy;
    const by = b.cy;
    if (a.depth === b.depth) {
      // Même colonne (un démenti sous sa cible) : une accolade par la droite.
      const x = a.cx + radiusOf(leftId) + 4;
      const xb = b.cx + radiusOf(rightId) + 4;
      const reach = Math.max(x, xb) + 56;
      return [
        {
          key,
          link,
          leftId,
          rightId,
          path: `M ${x} ${ay} C ${reach} ${ay}, ${reach} ${by}, ${xb} ${by}`,
          chip: { x: reach - 14, y: (ay + by) / 2 },
        },
      ];
    }
    const x1 = a.cx + radiusOf(leftId) + 4;
    const x2 = b.cx - radiusOf(rightId) - 6;
    const bend = Math.max(30, (x2 - x1) / 2);
    return [
      {
        key,
        link,
        leftId,
        rightId,
        path: `M ${x1} ${ay} C ${x1 + bend} ${ay}, ${x2 - bend} ${by}, ${x2} ${by}`,
        chip: { x: (x1 + x2) / 2, y: (ay + by) / 2 },
      },
    ];
  });

  return {
    width: Math.max(width, usedWidth),
    height: TREE.top * 2 + Math.max(1, nextRow) * rowHeight,
    compact,
    columnWidth,
    nodes,
    edges,
    parentOf,
  };
}

// Un grand arbre, de haut en bas : la génération 0 (la plus ancienne) en haut, puis une bande par
// génération. Dans une bande, les versions suivent l'ordre de leurs parents (les frères restent
// côte à côte) et passent à la ligne quand la largeur est pleine.
const CELL = 150;
const LABEL_BELOW = 74;
const LINE_HEIGHT = 136;
const BAND_GAP = 40;

function layoutLayers(
  versions: VersionRef[],
  links: LinkRef[],
  centerId: string,
  available: number | null,
) {
  const { parentOf, sideIds } = attachments(versions, links);
  const byId = new Map(versions.map((version) => [version.id, version]));
  const children = new Map<string, string[]>();
  for (const [child, parent] of parentOf) {
    children.set(parent, [...(children.get(parent) ?? []), child]);
  }
  const byDate = (a: string, b: string) =>
    time(byId.get(a)?.publishedAt ?? null) - time(byId.get(b)?.publishedAt ?? null);

  // Ordre de lecture : parcours en profondeur, reprises avant démentis et contexte.
  const depth = new Map<string, number>();
  const order: string[] = [];
  const visit = (id: string, level: number) => {
    depth.set(id, level);
    order.push(id);
    const kids = (children.get(id) ?? []).sort(
      (a, b) => Number(sideIds.has(a)) - Number(sideIds.has(b)) || byDate(a, b),
    );
    for (const kid of kids) visit(kid, level + 1);
  };
  const roots = versions.map((version) => version.id).filter((id) => !parentOf.has(id));
  for (const root of roots.sort(byDate)) visit(root, 0);

  const width = Math.max(available ?? TREE.defaultWidth, CELL * 2);
  const perLine = Math.max(1, Math.floor(width / CELL));
  const maxDepth = Math.max(0, ...depth.values());
  const nodes: TreeNode[] = [];
  let y = TREE.top + TREE.centerRadius;
  for (let level = 0; level <= maxDepth; level += 1) {
    const band = order.filter((id) => depth.get(id) === level);
    for (let start = 0; start < band.length; start += perLine) {
      const line = band.slice(start, start + perLine);
      const left = (width - line.length * CELL) / 2 + CELL / 2;
      line.forEach((id, index) => {
        const radius = id === centerId ? TREE.centerRadius : TREE.nodeRadius;
        nodes.push({
          id,
          depth: level,
          row: nodes.length,
          cx: left + index * CELL,
          cy: y + (TREE.centerRadius - radius),
        });
      });
      y += LINE_HEIGHT;
    }
    y += BAND_GAP;
  }
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const radiusOf = (id: string) => (id === centerId ? TREE.centerRadius : TREE.nodeRadius);

  const edges: TreeEdge[] = links.flatMap((link, index) => {
    const { left: topId, right: bottomId } = orient(link);
    const a = nodeById.get(topId);
    const b = nodeById.get(bottomId);
    if (!a || !b) return [];
    // Du bas de l'étiquette du parent au haut du cercle de l'enfant.
    const y1 = a.cy + radiusOf(topId) + LABEL_BELOW;
    const y2 = b.cy - radiusOf(bottomId) - 6;
    const bend = Math.max(24, (y2 - y1) / 2);
    return [
      {
        key: link.id ?? `${topId}-${bottomId}-${index}`,
        link,
        leftId: topId,
        rightId: bottomId,
        path: `M ${a.cx} ${y1} C ${a.cx} ${y1 + bend}, ${b.cx} ${y2 - bend}, ${b.cx} ${y2}`,
        chip: { x: (a.cx + b.cx) / 2, y: (y1 + y2) / 2 },
      },
    ];
  });

  return {
    width,
    height: y,
    columnWidth: CELL,
    compact: true,
    nodes,
    edges,
    parentOf,
  };
}
