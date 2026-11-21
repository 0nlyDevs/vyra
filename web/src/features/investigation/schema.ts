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
});

export type OpenCaseInput = z.infer<typeof openCaseSchema>;

export const caseIdSchema = z.uuid();
