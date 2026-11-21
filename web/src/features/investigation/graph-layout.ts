// Disposition du graphe de propagation : une colonne par version (la plus ancienne retrouvée à
// gauche), une ligne par branche. Une version qui reprend la précédente reste sur sa ligne ; une
// deuxième reprise de la même version part sur une nouvelle ligne.

type VersionRef = { id: string; position: number };
type LinkRef = { id: string; fromVersionId: string; toVersionId: string };

export const GRAPH = {
  // Largeur d'une colonne : laisse entre deux points la place de l'étiquette du lien.
  columnWidth: 240,
  laneHeight: 184,
  radius: 28,
  // Largeur du texte sous chaque point (date, source).
  labelWidth: 176,
  // Hauteur réservée au texte sous le point le plus bas.
  labelHeight: 92,
} as const;

const MARGIN_X = GRAPH.labelWidth / 2;
const MARGIN_Y = GRAPH.radius + 4;

export type NodePlacement = { id: string; column: number; lane: number; cx: number; cy: number };

export function layoutGraph(versions: VersionRef[], links: LinkRef[]) {
  const ordered = [...versions].sort((a, b) => a.position - b.position);
  const parentOf = new Map(links.map((link) => [link.toVersionId, link.fromVersionId]));
  const laneOf = new Map<string, number>();
  const parentLaneTaken = new Set<string>();
  let nextLane = 0;

  for (const version of ordered) {
    const parent = parentOf.get(version.id);
    const parentLane = parent === undefined ? undefined : laneOf.get(parent);
    if (parent !== undefined && parentLane !== undefined && !parentLaneTaken.has(parent)) {
      laneOf.set(version.id, parentLane);
      parentLaneTaken.add(parent);
    } else {
      laneOf.set(version.id, nextLane);
      nextLane += 1;
    }
  }

  const nodes: NodePlacement[] = ordered.map((version, column) => {
    const lane = laneOf.get(version.id) ?? 0;
    return {
      id: version.id,
      column,
      lane,
      cx: MARGIN_X + column * GRAPH.columnWidth,
      cy: MARGIN_Y + lane * GRAPH.laneHeight,
    };
  });
  const byId = new Map(nodes.map((node) => [node.id, node]));

  const edges = links.flatMap((link) => {
    const from = byId.get(link.fromVersionId);
    const to = byId.get(link.toVersionId);
    if (!from || !to) return [];
    const start = { x: from.cx + GRAPH.radius + 4, y: from.cy };
    const end = { x: to.cx - GRAPH.radius - 6, y: to.cy };
    const bend = Math.max(24, (end.x - start.x) / 2);
    return [
      {
        id: link.id,
        column: to.column,
        path: `M ${start.x} ${start.y} C ${start.x + bend} ${start.y}, ${end.x - bend} ${end.y}, ${end.x} ${end.y}`,
        // Pointe de flèche : la courbe arrive toujours à l'horizontale.
        arrow: `${end.x - 9},${end.y - 5} ${end.x},${end.y} ${end.x - 9},${end.y + 5}`,
        middle: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
      },
    ];
  });

  const lanes = Math.max(1, nextLane);
  return {
    nodes,
    edges,
    width: MARGIN_X * 2 + Math.max(0, ordered.length - 1) * GRAPH.columnWidth,
    height: MARGIN_Y + (lanes - 1) * GRAPH.laneHeight + GRAPH.radius + GRAPH.labelHeight,
  };
}
