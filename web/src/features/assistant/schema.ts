import { z } from 'zod';

export const assistantQuestionSchema = z.object({
  question: z.string().trim().min(2, 'Posez une question.').max(600, '600 caractères au maximum.'),
  pathname: z.string().max(200).default('/'),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), text: z.string().max(1500) }))
    .max(6)
    .default([]),
});

export const assistantAnswerSchema = z.object({
  answer: z.string(),
  cited: z.array(z.number().int()).max(12).default([]),
  // Propositions d'actions du modèle, non fiables : chacune est validée une à une (proposals.ts).
  actions: z.array(z.unknown()).max(6).default([]),
});
