'use server';

import { transcriptSchema } from '@/features/scan/schema';
import { type ActionResult, fail, ok } from '@/lib/action-result';
import { ERRORS } from '@/lib/errors';
import { aiCanReadAudio, runPrompt } from '@/server/processing';
import { getCurrentProfile } from '@/server/session';

// Dictée : un court enregistrement (WAV, une minute au plus) devient du texte. Rien n'est gardé.
const MAX_DICTATION_BYTES = 3 * 1024 * 1024;

export async function dictate(formData: FormData): Promise<ActionResult<{ text: string }>> {
  const profile = await getCurrentProfile();
  if (!profile) return fail(ERRORS.UNAUTHORIZED);
  const file = formData.get('audio');
  if (!(file instanceof File) || file.size === 0) return fail(ERRORS.VALIDATION_FAILED);
  if (file.size > MAX_DICTATION_BYTES) return fail(ERRORS.FILE_TOO_LARGE);
  if (file.type !== 'audio/wav') return fail(ERRORS.FILE_NOT_SUPPORTED);

  const bytes = Buffer.from(await file.arrayBuffer());
  const result = await runPrompt('transcribe', { fileName: 'dictee.wav' }, transcriptSchema, {
    files: [{ mimeType: 'audio/wav', data: bytes.toString('base64') }],
  });
  // Sans IA, la réponse préparée est vide : la dictée n'est pas possible.
  const text = result.ok && result.data.source === 'gemini' ? result.data.result.transcript : '';
  if (!text.trim()) return fail(ERRORS.AI_UNAVAILABLE);
  return ok({ text: text.trim() });
}

// Le bouton « Dicter » demande d'abord si une IA peut lire le son : sans clé Gemini (ni IA locale),
// il se présente comme indisponible, au lieu d'échouer après l'enregistrement.
export async function canDictate(): Promise<boolean> {
  return aiCanReadAudio();
}
