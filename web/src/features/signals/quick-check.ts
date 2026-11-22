import 'server-only';
import { z } from 'zod';
import { embedMissingCases } from '@/features/court/embeddings';
import { readDanger, readTone } from '@/features/signals/wording';
import {
  CERTAINTY_LABELS,
  CERTAINTY_TONES,
  type CertaintyLevel,
  DANGER_LEVEL_LABELS,
  DANGER_LEVEL_TONES,
  DANGER_SIGN_LABELS,
  TONE_LEVEL_LABELS,
  TONE_LEVEL_TONES,
  TONE_SIGN_LABELS,
  type Tone,
} from '@/lib/domain';
import { findJudgedCase } from '@/server/dal/court';
import { embedTexts, type FactCheck, findFactChecks, readPages } from '@/server/processing';

// Vérification rapide d'un texte ou d'un lien : l'affaire déjà jugée qui lui ressemble, les signes
// d'alerte relevés sans IA et les vérifications déjà publiées. Jamais de verdict nouveau.
// Une seule fonction pour l'extension (`/api/check`), l'application mobile (`/api/v1/check`) et
// l'onglet « Texte » du scan du site.

export const quickCheckSchema = z
  .object({
    text: z.string().trim().max(3000).default(''),
    url: z.union([z.literal(''), z.url({ protocol: /^https?$/ })]).default(''),
  })
  .refine((input) => input.text.length >= 10 || input.url !== '', {
    message: 'Un texte de 10 caractères au moins, ou un lien.',
  });

export type QuickCheckSignal = {
  label: string;
  tone: Tone;
  signs: { label: string; quote: string }[];
};

export type QuickCheck = {
  text: string;
  title: string;
  judged: {
    id: string;
    url: string;
    title: string;
    certainty: CertaintyLevel;
    label: string;
    tone: Tone;
    conclusion: string | null;
  } | null;
  signals: QuickCheckSignal[];
  factChecks: FactCheck[];
};

export type QuickCheckOutcome =
  | { ok: true; data: QuickCheck }
  | { ok: false; status: 400 | 422; message: string };

/** Les deux lectures sans IA d'un texte (ton, danger), avec leurs libellés. */
export function signalsOf(text: string): QuickCheckSignal[] {
  const tone = readTone(text);
  const danger = readDanger(text);
  return [
    {
      label: TONE_LEVEL_LABELS[tone.level],
      tone: TONE_LEVEL_TONES[tone.level],
      signs: tone.signs.map((sign) => ({ label: TONE_SIGN_LABELS[sign.kind], quote: sign.quote })),
    },
    {
      label: DANGER_LEVEL_LABELS[danger.level],
      tone: DANGER_LEVEL_TONES[danger.level],
      signs: danger.signs.map((sign) => ({
        label: DANGER_SIGN_LABELS[sign.kind],
        quote: sign.quote,
      })),
    },
  ];
}

export async function quickCheck(input: unknown): Promise<QuickCheckOutcome> {
  const parsed = quickCheckSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, status: 400, message: 'Un texte de 10 caractères au moins, ou un lien.' };
  }
  let { text } = parsed.data;
  const { url } = parsed.data;
  let title = '';
  if (text.length < 10 && url) {
    const pages = await readPages([url]);
    const page = pages.ok ? pages.data[0] : undefined;
    title = page?.title ?? '';
    text = (page?.body || page?.excerpt || title).slice(0, 3000);
  }
  if (text.length < 10) {
    return {
      ok: false,
      status: 422,
      message: 'Cette page ne se lit pas de l’extérieur : collez son texte.',
    };
  }

  await embedMissingCases();
  const [vectors, checks] = await Promise.all([
    embedTexts([text]),
    findFactChecks(text.slice(0, 500)),
  ]);
  const judged = await findJudgedCase(text, vectors.ok ? (vectors.data[0] ?? null) : null);
  // Libellés et couleurs déjà prêts : l'extension n'a pas à connaître le vocabulaire du domaine.
  return {
    ok: true,
    data: {
      text: text.slice(0, 600),
      title,
      judged: judged?.certainty
        ? {
            id: judged.id,
            url: `/verifier/${judged.id}`,
            title: judged.title,
            certainty: judged.certainty,
            label: CERTAINTY_LABELS[judged.certainty],
            tone: CERTAINTY_TONES[judged.certainty],
            conclusion: judged.conclusion,
          }
        : null,
      signals: signalsOf(text),
      factChecks: checks.ok ? checks.data.fact_checks.slice(0, 3) : [],
    },
  };
}
