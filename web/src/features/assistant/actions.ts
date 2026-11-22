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
import {
  type AiSource,
  embedTexts,
  findFactChecks,
  findWebSources,
  runPrompt,
} from '@/server/processing';
import { getCurrentProfile } from '@/server/session';
import { pickAssistantCases } from './context';
import { guardAnswer, NO_VERDICT_ANSWER } from './guard';
import { isCommand, pageFromCommand, wantsOutsideSources } from './intent';
import {
  autorunHref,
  buildProposals,
  fallbackProposals,
  PAGE_TARGETS,
  type Proposal,
} from './proposals';
import { assistantAnswerSchema, assistantQuestionSchema } from './schema';
import { buildExternal, buildReferences, externalForModel, type Reference } from './sources';

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
  // Navigation demandée ou formulaires que la personne confirme d'un clic.
  proposals: Proposal[];
  // Sources extérieures citées (Wikipédia, vérifications publiées) : des liens construits ici.
  references: Reference[];
  searchNotice?: string | null;
  // Une page à ouvrir tout de suite : la personne l'a demandé et c'est de la navigation seulement.
  autorun: string | null;
  source: AiSource;
};

type CaseRow = Awaited<ReturnType<typeof listCasesForAssistant>>[number];
const SEARCH_TIMEOUT_MS = 15_000;

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

  // Une commande simple (« ouvre le tribunal ») n'attend pas l'IA : on ouvre tout de suite. Seule la
  // navigation s'exécute ainsi ; le lien est construit ici, jamais repris d'un texte.
  const commanded = pageFromCommand(question);
  if (commanded) {
    const target = PAGE_TARGETS[commanded];
    return ok({
      answer: 'Je vous y emmène.',
      citations: [],
      proposals: [{ type: 'open_page', label: target.label, href: target.href, now: true }],
      references: [],
      autorun: target.href,
      source: 'fallback',
    });
  }

  // La recherche extérieure commence pendant la récupération du dossier, avec un délai adapté
  // à une conversation (le moteur des enquêtes peut continuer beaucoup plus longtemps).
  const requested = wantsOutsideSources(question);
  const query = question.length >= 10 ? question : `Informations sur ${question}`;
  const sourceSearch = requested
    ? Promise.all([
        findFactChecks(query.slice(0, 300), SEARCH_TIMEOUT_MS),
        findWebSources(query, [], SEARCH_TIMEOUT_MS),
      ])
    : Promise.resolve([null, null] as const);

  // Recherche par le sens : les affaires les plus proches de la question, puis les plus récentes.
  await embedMissingCases();
  const vectors = await embedTexts([question]);
  const embedding = vectors.ok ? (vectors.data[0] ?? null) : null;
  const rows = pickAssistantCases(
    embedding ? await listNearestCasesForAssistant(embedding) : [],
    await listCasesForAssistant(),
  );

  // Les moteurs indépendants tournent ensemble. Une panne du web ne retire pas les résultats
  // de Wikipédia ou des vérificateurs, et aucune de ces sources n'est un verdict de Vyra.
  const [found, web] = await sourceSearch;
  const webAvailable = Boolean(web?.ok && web.data.source !== 'fallback');
  const checksAvailable = Boolean(found?.ok && found.data.searched);
  const external = buildExternal(
    found?.ok ? found.data.wikipedia : [],
    found?.ok ? found.data.fact_checks : [],
    web?.ok && web.data.source !== 'fallback' ? web.data.articles : [],
  );
  const searchNotice = !requested
    ? null
    : !webAvailable && !checksAvailable
      ? 'La recherche en ligne est indisponible. La réponse s’appuie sur les affaires du dossier.'
      : !webAvailable
        ? 'La recherche web générale est indisponible. Seules Wikipédia et les vérifications publiées ont pu être consultées.'
        : external.length === 0
          ? 'Aucune source extérieure exploitable n’a été trouvée pour cette recherche.'
          : null;

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
      external: externalForModel(external),
      search: {
        requested,
        webAvailable,
        checksAvailable,
        searchedAt: requested ? new Date().toISOString() : null,
      },
      history,
    },
    assistantAnswerSchema,
  );

  if (result.ok && result.data.source === 'gemini' && result.data.result.answer.trim()) {
    // Seules les affaires et les sources fournies peuvent être citées.
    const citations = [...new Set(result.data.result.cited)]
      .map((number) => ({ number, row: rows[number - 1] }))
      .filter((entry): entry is { number: number; row: CaseRow } => entry.row !== undefined)
      .map(({ number, row }) => ({
        number,
        title: row.title,
        href: hrefOf(row),
        certainty: row.certainty,
      }));
    const references = buildReferences(result.data.result.citedExternal, external);
    // L'IA peut mal faire : sa réponse est contrôlée avant d'être lue (pas de lien inventé, pas de
    // verdict sans affaire jugée ni source citée).
    const guarded = guardAnswer(
      result.data.result.answer,
      citations.filter((citation) => citation.certainty !== null).length,
    );
    // Un verdict sans source est remplacé : on propose alors d'enquêter ou de signaler. Sinon, seules
    // comptent les propositions du modèle, validées une à une ; elles ne s'exécutent seules que si la
    // personne l'a demandé et que c'est de la navigation.
    const proposals =
      guarded.answer === NO_VERDICT_ANSWER
        ? fallbackProposals(question, null)
        : buildProposals(result.data.result.actions, rows, { allowNow: isCommand(question) });
    return ok({
      answer: guarded.answer,
      citations,
      proposals,
      references,
      searchNotice,
      autorun: autorunHref(proposals),
      source: 'gemini',
    });
  }

  if (external.length > 0) {
    return ok({
      answer:
        'Je ne peux pas rédiger la synthèse avec l’IA pour le moment. Voici les sources retrouvées : consultez leurs textes et leurs dates. Elles ne constituent pas une conclusion du tribunal.',
      citations: [],
      proposals: fallbackProposals(question, null),
      references: buildReferences(
        external.map((item) => item.number),
        external,
      ),
      searchNotice,
      autorun: null,
      source: 'fallback',
    });
  }

  const offline = await offlineAnswer(question, pathname, rows, embedding);
  const autorun = autorunHref(offline.proposals, isCommand(question));
  return ok({
    answer: offline.answer,
    citations: offline.citations,
    proposals: offline.proposals.map((proposal) =>
      proposal.href === autorun ? { ...proposal, now: true } : proposal,
    ),
    references: [],
    searchNotice,
    autorun,
    source: 'fallback',
  });
}
