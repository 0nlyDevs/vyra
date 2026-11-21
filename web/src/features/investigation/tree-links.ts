import 'server-only';
import { z } from 'zod';
import {
  CHANGE_TYPES,
  type ChangeType,
  type InfoRelation,
  LINK_CONFIDENCES,
  type LinkConfidence,
} from '@/lib/domain';
import { runPrompt } from '@/server/processing';
import { guessChange } from './guess-change';
import { buildLineage, closest, type LineageBasis } from './lineage';

// Les liens de l'arbre de propagation, prêts à enregistrer : qui reprend qui (avec ce qui change,
// décrit par l'IA), à quoi se rattache chaque démenti, et le contexte rattaché à la racine.

export type TreeItem = {
  key: string;
  // « same » : une version du même fait (dont l'information analysée elle-même).
  relation: InfoRelation;
  // Le texte enregistré comme version, et celui de la page quand on l'a (plus long).
  text: string;
  body: string;
  url: string | null;
  site: string;
  links: string[];
  time: number | null;
  // La phrase de l'IA pour un démenti ou un même sujet.
  reason?: string;
};

export type TreeLink = {
  from: string;
  to: string;
  changeType: ChangeType;
  note: string;
  confidence: LinkConfidence;
};

const compareSchema = z.object({
  links: z.array(
    z.object({
      changeType: z.enum(CHANGE_TYPES),
      note: z.string().min(1),
      confidence: z.enum(LINK_CONFIDENCES),
    }),
  ),
});

// La confiance d'un lien « reprend » vient de l'indice trouvé, pas de l'IA.
const BASIS_CONFIDENCE = {
  link: 'high',
  citation: 'high',
  text: 'medium',
  guess: 'low',
} satisfies Record<LineageBasis, LinkConfidence>;

function basisNote(basis: LineageBasis, parent: TreeItem) {
  if (basis === 'link') return `Lien vers ${parent.site}.`;
  if (basis === 'citation') return `Cite ${parent.site}.`;
  if (basis === 'text') return 'Phrases reprises.';
  return 'Reprise possible, sans phrase commune.';
}

export async function describeTree(items: TreeItem[]): Promise<TreeLink[]> {
  const byKey = new Map(items.map((item) => [item.key, item]));
  const versions = items.filter((item) => item.relation === 'same');
  const lineage = buildLineage(
    versions.map((item) => ({
      key: item.key,
      time: item.time,
      text: item.body || item.text,
      url: item.url,
      site: item.site,
      links: item.links,
    })),
  );

  // Ce qui change d'une version à celle qui la reprend : l'IA, en un seul appel.
  const pairs = lineage.map((edge) => ({
    before: byKey.get(edge.parent)?.text ?? '',
    after: byKey.get(edge.child)?.text ?? '',
  }));
  const described =
    pairs.length > 0 ? await runPrompt('compare-versions', { pairs }, compareSchema) : null;
  const fromAi =
    described?.ok && described.data.result.links.length === pairs.length
      ? described.data.result.links
      : null;

  const reprises: TreeLink[] = lineage.map((edge, index) => {
    const pair = pairs[index] ?? { before: '', after: '' };
    const change = fromAi?.[index] ?? guessChange(pair.before, pair.after);
    const parent = byKey.get(edge.parent);
    return {
      from: edge.parent,
      to: edge.child,
      changeType: change.changeType,
      note: `${parent ? basisNote(edge.basis, parent) : ''} ${change.note}`.trim(),
      confidence: BASIS_CONFIDENCE[edge.basis],
    };
  });

  // La racine : la plus ancienne version, celle qui n'est reprise de personne.
  const children = new Set(lineage.map((edge) => edge.child));
  const root = versions.find((item) => !children.has(item.key));

  const others: TreeLink[] = items.flatMap((item): TreeLink[] => {
    if (item.relation === 'contradicts') {
      // Un démenti se rattache à la version dont il est le plus proche : celle qu'il dément.
      const target = closest(
        item.body || item.text,
        versions.map((version) => ({ key: version.key, text: version.body || version.text })),
      );
      if (!target) return [];
      return [
        {
          from: item.key,
          to: target,
          changeType: 'contradicts',
          note: item.reason ?? 'Dément cette version, selon l’IA.',
          confidence: 'medium',
        },
      ];
    }
    if (item.relation === 'related' && root) {
      return [
        {
          from: item.key,
          to: root.key,
          changeType: 'related',
          note: item.reason ?? 'Même sujet, autre fait, selon l’IA.',
          confidence: 'medium',
        },
      ];
    }
    return [];
  });

  return [...reprises, ...others];
}
