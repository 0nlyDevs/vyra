import { z } from 'zod';
import { VOTES } from '@/lib/domain';

// Formes des réponses des prompts `prosecution`, `defense` et `judge` (et de leurs secours).

export const pleadingSchema = z.object({
  argument: z.string().min(1),
  cited: z.array(z.number().int()).max(20).default([]),
});

export const verdictSchema = z.object({
  confirmed: z.array(z.string()).max(8).default([]),
  contested: z.array(z.string()).max(8).default([]),
  missing: z.array(z.string()).max(8).default([]),
  conclusion: z.string().min(1),
  whatToCheck: z.string().default(''),
});

export const openHearingSchema = z.object({ caseId: z.uuid() });

export const voteSchema = z.object({ hearingId: z.uuid(), vote: z.enum(VOTES) });

export const judgedSearchSchema = z.object({
  query: z
    .string()
    .trim()
    .min(2, 'Écrivez au moins 2 caractères.')
    .max(1000, '1 000 caractères au maximum.'),
});
