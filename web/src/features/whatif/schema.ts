import { z } from 'zod';

// Forme de la réponse du prompt `what-if` (et de ses réponses de secours).
// `calm` : la version calme d'un contenu réel. Les trois autres : une affaire fictive, racontée
// de trois façons pour s'entraîner à repérer les manipulations.
export const WHAT_IF_IDS = ['calm', 'faithful', 'alarmist', 'misleading'] as const;
export type WhatIfId = (typeof WHAT_IF_IDS)[number];

export const whatIfResultSchema = z.object({
  versions: z
    .array(
      z.object({
        id: z.enum(WHAT_IF_IDS),
        label: z.string().min(1),
        text: z.string().min(1),
        changes: z.array(z.string()).max(6).default([]),
      }),
    )
    .min(1)
    .max(4),
  takeaway: z.string().default(''),
});

export const whatIfInputSchema = z.object({ caseId: z.uuid() });
