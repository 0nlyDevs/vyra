import { z } from 'zod';

// Fichiers acceptés par le scan, et formes des réponses des prompts `read-image` et `transcribe`.

export const MAX_FILE_BYTES = 8 * 1024 * 1024;

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const AUDIO_TYPES = [
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/mpeg',
  'audio/mp3',
  'audio/ogg',
  'audio/webm',
  'audio/mp4',
  'audio/x-m4a',
];

// Distance maximale entre deux empreintes d'image (sur 64) pour dire « c'est la même image ».
// Mesuré sur la démo : même photo recompressée et recadrée 5, images sans rapport 28 à 34.
export const MAX_IMAGE_DISTANCE = 12;

export const readingSchema = z.object({
  description: z.string().default(''),
  observations: z.array(z.string()).max(8).default([]),
  textInImage: z.string().default(''),
});

export const transcriptSchema = z.object({
  transcript: z.string().default(''),
  language: z.string().default(''),
  translation: z.string().default(''),
  claim: z.string().default(''),
});

export const imageMatchesSchema = z
  .array(z.object({ versionId: z.uuid(), distance: z.number().int().min(0).max(64) }))
  .max(50);

export const addToCaseSchema = z.object({ scanId: z.uuid(), caseId: z.uuid() });

export const scanIdSchema = z.object({ scanId: z.uuid() });
