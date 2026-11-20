import { z } from 'zod';

export const noteSchema = z.object({
  content: z
    .string()
    .trim()
    .min(3, 'Écrivez au moins 3 caractères.')
    .max(500, '500 caractères au maximum.'),
});

export const searchSchema = z.object({
  query: z.string().trim().min(2, 'Écrivez au moins 2 caractères.').max(200),
});

// Forme du JSON du prompt `summarize` (processing/app/prompts/summarize.md et son secours).
export const summarySchema = z.object({
  summary: z.string().min(1),
  actions: z.array(z.string()).max(5),
});
