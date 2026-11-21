import { z } from 'zod';
import { REPORT_REASONS } from '@/lib/domain';

// Un signalement : le texte ou le lien du contenu (au moins l'un des deux), un motif, et une
// description facultative. `feedPostId` arrive tout seul quand on signale depuis le fil.
export const reportSchema = z
  .object({
    content: z.string().trim().max(1000, '1 000 caractères au maximum.'),
    url: z
      .string()
      .trim()
      .pipe(
        z.union([
          z.literal(''),
          z.url({
            protocol: /^https?$/,
            error: 'Collez un lien complet, qui commence par https://',
          }),
        ]),
      ),
    feedPostId: z.union([z.literal(''), z.uuid()]),
    reason: z.enum(REPORT_REASONS, { error: 'Choisissez un motif.' }),
    description: z.string().trim().max(500, '500 caractères au maximum.'),
  })
  .refine((report) => report.content.length >= 10 || report.url !== '', {
    message: 'Collez le texte du contenu (10 caractères au moins) ou son lien.',
    path: ['content'],
  });

// Un signalement sans compte : le même contenu, sans publication du fil ni description.
export const tipSchema = z
  .object({
    content: reportSchema.shape.content,
    url: reportSchema.shape.url,
    reason: reportSchema.shape.reason,
  })
  .refine((tip) => tip.content.length >= 10 || tip.url !== '', {
    message: 'Collez le texte du contenu (10 caractères au moins) ou son lien.',
    path: ['content'],
  });

export const followTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{16,32}$/);
