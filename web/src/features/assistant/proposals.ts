import { z } from 'zod';

// L'agent de Vyra PROPOSE, il n'exécute jamais. Une proposition est un lien que la personne confirme
// d'un clic : les pages qu'il ouvre (enquête, signalement, tribunal) refont elles-mêmes la connexion,
// la validation et les limites. Garde-fous par construction :
// - une liste fermée de types d'actions ; tout le reste est écarté ;
// - les liens sont construits ICI, jamais repris de ce que dit le modèle ;
// - une affaire n'est proposée que si elle fait partie de celles fournies au modèle ;
// - trois propositions au plus, et un texte pré-rempli borné.

export const MAX_PROPOSALS = 3;
const MAX_TEXT = 600;

export const PAGE_TARGETS = {
  feed: { href: '/feed', label: 'Ouvrir le fil d’actualité' },
  cases: { href: '/cases', label: 'Ouvrir les enquêtes' },
  court: { href: '/court', label: 'Ouvrir le tribunal' },
  reports: { href: '/reports', label: 'Ouvrir la boîte d’alertes' },
  scan: { href: '/scan', label: 'Examiner un fichier ou un lien' },
  game: { href: '/game', label: 'Jouer à Vrai ou fake ?' },
  flash: { href: '/verifier/flash', label: 'Lire le flash radio' },
} as const;
const PAGES = Object.keys(PAGE_TARGETS) as [
  keyof typeof PAGE_TARGETS,
  ...(keyof typeof PAGE_TARGETS)[],
];

export type Proposal = { type: string; label: string; href: string };
type CaseRef = { id: string; title: string; status: string };

const rawProposalSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('open_case'), case: z.number().int() }),
  z.object({ type: z.literal('open_court'), case: z.number().int() }),
  z.object({ type: z.literal('report'), text: z.string() }),
  z.object({ type: z.literal('start_investigation'), text: z.string() }),
  z.object({ type: z.literal('open_page'), page: z.enum(PAGES) }),
]);

const clean = (text: string) => text.replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT);

// Les propositions du modèle (« raw », non fiable), filtrées et transformées en liens sûrs.
// `rows` : les affaires fournies au modèle, dans l'ordre de leurs numéros (1, 2…).
export function buildProposals(raw: readonly unknown[], rows: readonly CaseRef[]): Proposal[] {
  const proposals: Proposal[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const parsed = rawProposalSchema.safeParse(item);
    if (!parsed.success) continue;
    const action = parsed.data;
    let proposal: Proposal | null = null;
    if (action.type === 'open_case' || action.type === 'open_court') {
      const row = rows[action.case - 1];
      if (row) {
        const concluded = row.status === 'concluded';
        const toCourt = action.type === 'open_court' || concluded;
        proposal = {
          type: action.type,
          label: toCourt ? `Voir l’audience : ${row.title}` : `Ouvrir l’affaire : ${row.title}`,
          href: toCourt && concluded ? `/court/${row.id}` : `/cases/${row.id}`,
        };
      }
    } else if (action.type === 'report' || action.type === 'start_investigation') {
      const text = clean(action.text);
      if (text.length >= 10) {
        proposal =
          action.type === 'report'
            ? {
                type: action.type,
                label: 'Signaler ce contenu',
                href: `/reports?text=${encodeURIComponent(text)}`,
              }
            : {
                type: action.type,
                label: 'Ouvrir une enquête avec ce texte',
                href: `/cases?information=${encodeURIComponent(text)}`,
              };
      }
    } else {
      const target = PAGE_TARGETS[action.page];
      proposal = { type: action.type, label: target.label, href: target.href };
    }
    if (proposal && !seen.has(proposal.href)) {
      seen.add(proposal.href);
      proposals.push(proposal);
    }
    if (proposals.length === MAX_PROPOSALS) break;
  }
  return proposals;
}

// Sans IA, les propositions se déduisent de la situation : une affaire jugée à voir, sinon une
// enquête à ouvrir ou un contenu à signaler.
export function fallbackProposals(
  question: string,
  judged: { id: string; title: string } | null,
): Proposal[] {
  if (judged) {
    return [
      {
        type: 'open_court',
        label: `Voir l’audience : ${judged.title}`,
        href: `/court/${judged.id}`,
      },
    ];
  }
  return buildProposals(
    [
      { type: 'start_investigation', text: question },
      { type: 'report', text: question },
    ],
    [],
  );
}

// L'application mobile n'a ni tribunal ni jeu : une audience devient le dossier de l'affaire (sa
// conclusion et son sceau y sont), et les pages absentes du téléphone sont écartées.
const MOBILE_HIDDEN = ['/court', '/game', '/verifier/flash'];
const COURT_CASE = /^\/court\/([0-9a-f-]{36})$/;
const COURT_LABEL = 'Voir l’audience : ';

export function mobileProposals(proposals: readonly Proposal[]): Proposal[] {
  const kept: Proposal[] = [];
  const seen = new Set<string>();
  for (const proposal of proposals) {
    const court = COURT_CASE.exec(proposal.href);
    const next = court
      ? {
          type: 'open_case',
          label: proposal.label.startsWith(COURT_LABEL)
            ? `Ouvrir l’affaire : ${proposal.label.slice(COURT_LABEL.length)}`
            : proposal.label,
          href: `/cases/${court[1]}`,
        }
      : proposal;
    if (MOBILE_HIDDEN.some((path) => next.href === path || next.href.startsWith(`${path}/`))) {
      continue;
    }
    if (seen.has(next.href)) continue;
    seen.add(next.href);
    kept.push(next);
  }
  return kept;
}
