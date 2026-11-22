'use server';

import { embedMissingCases } from '@/features/court/embeddings';
import { type ActionResult, fail, ok } from '@/lib/action-result';
import { CERTAINTY_LABELS, type CertaintyLevel } from '@/lib/domain';
import { ERRORS } from '@/lib/errors';
import { HOME_ITEM, KIT_ITEM, MODULE_ITEMS } from '@/lib/navigation';
import {
  findJudgedCase,
  listCasesForAssistant,
  listNearestCasesForAssistant,
} from '@/server/dal/court';
import { type AiSource, embedTexts, runPrompt } from '@/server/processing';
import { getCurrentProfile } from '@/server/session';
import { pickAssistantCases } from './context';
import { guardAnswer, NO_VERDICT_ANSWER } from './guard';
import { buildProposals, fallbackProposals, type Proposal } from './proposals';
import { assistantAnswerSchema, assistantQuestionSchema } from './schema';

// L'assistant : répond à partir des affaires du dossier, en les citant. Jamais de verdict nouveau.
// Sans IA, une réponse écrite sans modèle (affaire déjà jugée qui ressemble, sinon aide de la page).

export type Citation = {
  number: number;
  title: string;
  href: string;
  certainty: CertaintyLevel | null;
};

export type AssistantAnswer = {
  answer: string;
  citations: Citation[];
  // Actions que la personne peut confirmer d'un clic ; l'assistant n'exécute rien lui-même.
  proposals: Proposal[];
  source: AiSource;
};

type CaseRow = Awaited<ReturnType<typeof listCasesForAssistant>>[number];

function pageHelp(pathname: string) {
  const item = [...MODULE_ITEMS, KIT_ITEM, HOME_ITEM].find((entry) =>
    pathname.startsWith(entry.href),
  );
  return item ? `Page « ${item.label} » : ${item.description}` : 'Page de la plateforme.';
}

function hrefOf(row: CaseRow) {
  return row.status === 'concluded' ? `/court/${row.id}` : `/cases/${row.id}`;
}

async function offlineAnswer(
  question: string,
  pathname: string,
  rows: CaseRow[],
  embedding: number[] | null,
) {
  const open = rows.filter((row) => row.status !== 'concluded').slice(0, 4);
  if (/en cours|ouvert|enqu[eê]te/i.test(question) && open.length > 0) {
    const numbers = open.map((_, index) => `[${index + 1}]`).join(', ');
    return {
      answer: `${open.length} affaires sont en cours de vérification ${numbers}. Aucune n’est encore jugée : attendez la conclusion du tribunal avant de partager.`,
      citations: open.map((row, index) => ({
        number: index + 1,
        title: row.title,
        href: hrefOf(row),
        certainty: row.certainty,
      })),
      proposals: open.slice(0, 2).map((row) => ({
        type: 'open_case',
        label: `Ouvrir l’affaire : ${row.title}`,
        href: hrefOf(row),
      })),
    };
  }
  const judged = await findJudgedCase(question, embedding);
  if (judged?.certainty) {
    const level = CERTAINTY_LABELS[judged.certainty].toLowerCase();
    return {
      answer:
        `Cette information ressemble à une affaire déjà jugée, « ${judged.title} » [1]. Conclusion : ${level}. ${judged.conclusion ?? ''}`.trim(),
      citations: [
        {
          number: 1,
          title: judged.title,
          href: `/court/${judged.id}`,
          certainty: judged.certainty,
        },
      ],
      proposals: fallbackProposals(question, judged),
    };
  }
  return {
    answer: `Je n’ai trouvé aucune affaire jugée qui en parle. Je ne peux pas trancher : ouvrez une enquête dans le module Enquêtes, ou signalez le contenu dans Alertes. ${pageHelp(pathname)}`,
    citations: [],
    proposals: fallbackProposals(question, null),
  };
}

export async function askAssistant(input: {
  question: string;
  pathname: string;
  history: { role: 'user' | 'assistant'; text: string }[];
}): Promise<ActionResult<AssistantAnswer>> {
  const profile = await getCurrentProfile();
  if (!profile) return fail(ERRORS.UNAUTHORIZED);
  const parsed = assistantQuestionSchema.safeParse(input);
  if (!parsed.success) return fail(ERRORS.VALIDATION_FAILED, parsed.error);
  const { question, pathname, history } = parsed.data;

  // Recherche par le sens : les affaires les plus proches de la question, puis les plus récentes.
  await embedMissingCases();
  const vectors = await embedTexts([question]);
  const embedding = vectors.ok ? (vectors.data[0] ?? null) : null;
  const rows = pickAssistantCases(
    embedding ? await listNearestCasesForAssistant(embedding) : [],
    await listCasesForAssistant(),
  );
  const result = await runPrompt(
    'assistant',
    {
      question,
      page: pageHelp(pathname),
      cases: rows.map((row, index) => ({
        number: index + 1,
        title: row.title,
        claim: row.claim,
        status: row.status === 'concluded' ? 'conclue' : 'en cours',
        certainty: row.certainty ? CERTAINTY_LABELS[row.certainty] : null,
        conclusion: row.conclusion,
      })),
      history,
    },
    assistantAnswerSchema,
  );

  if (result.ok && result.data.source === 'gemini' && result.data.result.answer.trim()) {
    // Seules les affaires fournies peuvent être citées.
    const citations = [...new Set(result.data.result.cited)]
      .map((number) => ({ number, row: rows[number - 1] }))
      .filter((entry): entry is { number: number; row: CaseRow } => entry.row !== undefined)
      .map(({ number, row }) => ({
        number,
        title: row.title,
        href: hrefOf(row),
        certainty: row.certainty,
      }));
    // L'IA peut mal faire : sa réponse est contrôlée avant d'être lue (pas de lien inventé, pas de
    // verdict sans affaire jugée citée).
    const guarded = guardAnswer(result.data.result.answer, citations.length);
    // Un verdict sans affaire citée est remplacé : on propose alors d'enquêter ou de signaler. Sinon,
    // seules comptent les propositions du modèle, validées une à une.
    const proposals =
      guarded.answer === NO_VERDICT_ANSWER
        ? fallbackProposals(question, null)
        : buildProposals(result.data.result.actions, rows);
    return ok({ answer: guarded.answer, citations, proposals, source: 'gemini' });
  }

  const offline = await offlineAnswer(question, pathname, rows, embedding);
  return ok({
    answer: offline.answer,
    citations: offline.citations,
    proposals: offline.proposals,
    source: 'fallback',
  });
}
