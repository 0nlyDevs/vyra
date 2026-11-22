import { z } from 'zod';

// Une information à analyser : le texte reçu, et le lien où on l'a vue s'il y en a un.
export const openCaseSchema = z.object({
  claim: z
    .string()
    .trim()
    .min(15, 'Collez au moins une phrase (15 caractères).')
    .max(2000, '2 000 caractères au maximum.'),
  sourceUrl: z
    .union([z.literal(''), z.url({ protocol: /^https?$/, message: 'Ce lien n’est pas valide.' })])
    .optional()
    .transform((value) => value || null),
  // Le nom de la source quand on part d'un lien ou d'une publication du fil (sinon déduit du lien).
  sourceName: z.string().trim().max(200).optional(),
});

export type OpenCaseInput = z.infer<typeof openCaseSchema>;

export const caseIdSchema = z.uuid();

export const exploreSchema = z.object({ caseId: z.uuid(), versionId: z.uuid() });

// Une vérification publiée ou un article Wikipédia versé au dossier comme pièce de contexte.
export const addReferenceSchema = z.object({
  caseId: z.uuid(),
  kind: z.enum(['fact_check', 'wikipedia']),
  url: z.url({ protocol: /^https?$/ }),
  title: z.string().trim().min(1).max(300),
  content: z.string().trim().min(1).max(1500),
  sourceName: z.string().trim().min(1).max(120),
  publishedAt: z.iso.datetime({ offset: true }).or(z.iso.date()).nullable(),
});
