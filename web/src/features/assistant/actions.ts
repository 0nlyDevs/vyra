'use server';

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
import { assistantAnswerSchema, assistantQuestionSchema } from './schema';

// L'assistant : répond à partir des affaires du dossier, en les citant. Jamais de verdict nouveau.
// Sans IA, une réponse écrite sans modèle (affaire déjà jugée qui ressemble, sinon aide de la page).

export type Citation = {
  number: number;
  title: string;
  href: string;
  certainty: CertaintyLevel | null;
};

export type AssistantAnswer = { answer: string; citations: Citation[]; source: AiSource };

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
    };
  }
  return {
    answer: `Je n’ai trouvé aucune affaire jugée qui en parle. Je ne peux pas trancher : ouvrez une enquête dans le module Enquêtes, ou signalez le contenu dans Alertes. ${pageHelp(pathname)}`,
    citations: [],
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
    return ok({ answer: result.data.result.answer.trim(), citations, source: 'gemini' });
  }

  const offline = await offlineAnswer(question, pathname, rows, embedding);
  return ok({ answer: offline.answer, citations: offline.citations, source: 'fallback' });
}
