import { z } from 'zod';
import { embedMissingCases } from '@/features/court/embeddings';
import { readDanger, readTone } from '@/features/signals/wording';
import {
  CERTAINTY_LABELS,
  CERTAINTY_TONES,
  DANGER_LEVEL_LABELS,
  DANGER_LEVEL_TONES,
  DANGER_SIGN_LABELS,
  TONE_LEVEL_LABELS,
  TONE_LEVEL_TONES,
  TONE_SIGN_LABELS,
} from '@/lib/domain';
import { findJudgedCase } from '@/server/dal/court';
import { embedTexts, findFactChecks, readPages } from '@/server/processing';
import { clientIp, withinLimit } from '@/server/rate-limit';

// Vérification rapide pour l'extension du navigateur, sans compte : un texte sélectionné ou un
// lien. Renvoie l'affaire déjà jugée qui lui ressemble, les signes d'alerte relevés sans IA et les
// vérifications déjà publiées. Jamais de verdict nouveau.

const checkSchema = z
  .object({
    text: z.string().trim().max(3000).default(''),
    url: z.union([z.literal(''), z.url({ protocol: /^https?$/ })]).default(''),
  })
  .refine((input) => input.text.length >= 10 || input.url !== '', {
    message: 'Un texte de 10 caractères au moins, ou un lien.',
  });

export async function POST(request: Request) {
  // Route publique qui appelle l'IA et lit des pages : limitée par adresse, comme les signalements.
  if (!(await withinLimit(`check:ip:${await clientIp()}`, 60, 60 * 60))) {
    return Response.json({ error: 'Trop de vérifications. Réessayez plus tard.' }, { status: 429 });
  }
  const body = await request.json().catch(() => null);
  const parsed = checkSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Un texte de 10 caractères au moins, ou un lien.' },
      { status: 400 },
    );
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
    return Response.json(
      { error: 'Cette page ne se lit pas de l’extérieur : sélectionnez son texte.' },
      { status: 422 },
    );
  }

  await embedMissingCases();
  const [vectors, checks] = await Promise.all([
    embedTexts([text]),
    findFactChecks(text.slice(0, 500)),
  ]);
  const judged = await findJudgedCase(text, vectors.ok ? (vectors.data[0] ?? null) : null);
  const tone = readTone(text);
  const danger = readDanger(text);
  // Libellés et couleurs déjà prêts : l'extension n'a pas à connaître le vocabulaire du domaine.
  return Response.json({
    text: text.slice(0, 600),
    title,
    judged: judged?.certainty
      ? {
          url: `/verifier/${judged.id}`,
          title: judged.title,
          label: CERTAINTY_LABELS[judged.certainty],
          tone: CERTAINTY_TONES[judged.certainty],
          conclusion: judged.conclusion,
        }
      : null,
    signals: [
      {
        label: TONE_LEVEL_LABELS[tone.level],
        tone: TONE_LEVEL_TONES[tone.level],
        signs: tone.signs.map((sign) => ({
          label: TONE_SIGN_LABELS[sign.kind],
          quote: sign.quote,
        })),
      },
      {
        label: DANGER_LEVEL_LABELS[danger.level],
        tone: DANGER_LEVEL_TONES[danger.level],
        signs: danger.signs.map((sign) => ({
          label: DANGER_SIGN_LABELS[sign.kind],
          quote: sign.quote,
        })),
      },
    ],
    factChecks: checks.ok ? checks.data.fact_checks.slice(0, 3) : [],
  });
}
