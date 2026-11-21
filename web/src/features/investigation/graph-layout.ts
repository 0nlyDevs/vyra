// Disposition de la toile : l'information analysée au centre, chaque source autour, sur une
// ellipse, dans l'ordre des dates (la plus ancienne en haut à droite, puis dans le sens des
// aiguilles d'une montre). Chaque source est reliée au centre.

type VersionRef = { id: string; publishedAt: Date | null };

export const WEB = {
  centerRadius: 46,
  nodeRadius: 26,
  // Texte sous (ou au-dessus de) chaque source : date, nom, type.
  labelWidth: 150,
  labelHeight: 104,
  // Demi-axes de l'ellipse : larges sur un écran large, jamais trop serrés.
  maxRadiusX: 340,
  minRadiusX: 170,
  radiusY: 175,
  // Place de l'étiquette d'un lien, entre le centre et la source (0 = centre, 1 = source).
  chipAt: 0.56,
  defaultWidth: 900,
} as const;

export type WebNode = {
  id: string;
  cx: number;
  cy: number;
  // L'étiquette va vers l'extérieur : au-dessus pour les sources du haut, dessous sinon.
  labelAbove: boolean;
  // Rang dans l'ordre des dates, pour l'apparition progressive.
  order: number;
};

export type WebEdge = {
  nodeId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  chip: { x: number; y: number };
};

function time(date: Date | null) {
  return date ? date.getTime() : Number.MAX_SAFE_INTEGER;
}

export function layoutWeb(versions: VersionRef[], centerId: string, available: number | null) {
  const width = Math.max(available ?? WEB.defaultWidth, WEB.minRadiusX * 2 + WEB.labelWidth);
  const radiusX = Math.max(
    WEB.minRadiusX,
    Math.min(WEB.maxRadiusX, (width - WEB.labelWidth) / 2 - 8),
  );
  const top = WEB.labelHeight + WEB.nodeRadius + 8;
  const center = { x: width / 2, y: top + WEB.radiusY };
  const height = center.y + WEB.radiusY + WEB.nodeRadius + WEB.labelHeight + 8;

  const around = versions
    .filter((version) => version.id !== centerId)
    .sort((a, b) => time(a.publishedAt) - time(b.publishedAt));
  // Décalage d'un demi-pas : on évite de poser une source pile au-dessus ou au-dessous du centre.
  const step = (2 * Math.PI) / Math.max(1, around.length);
  const start = -Math.PI / 2 + step / 2;

  const nodes: WebNode[] = around.map((version, order) => {
    const angle = start + order * step;
    const cx = center.x + radiusX * Math.cos(angle);
    const cy = center.y + WEB.radiusY * Math.sin(angle);
    return { id: version.id, cx, cy, labelAbove: Math.sin(angle) < -0.2, order };
  });

  const edges: WebEdge[] = nodes.map((node) => {
    const dx = node.cx - center.x;
    const dy = node.cy - center.y;
    const length = Math.hypot(dx, dy) || 1;
    const ux = dx / length;
    const uy = dy / length;
    const x1 = center.x + ux * (WEB.centerRadius + 4);
    const y1 = center.y + uy * (WEB.centerRadius + 4);
    const x2 = node.cx - ux * (WEB.nodeRadius + 4);
    const y2 = node.cy - uy * (WEB.nodeRadius + 4);
    return {
      nodeId: node.id,
      x1,
      y1,
      x2,
      y2,
      chip: { x: x1 + (x2 - x1) * WEB.chipAt, y: y1 + (y2 - y1) * WEB.chipAt },
    };
  });

  return { width, height, center, nodes, edges };
}
