'use server';

import { transcriptSchema } from '@/features/scan/schema';
import { type ActionResult, fail, ok } from '@/lib/action-result';
import { ERRORS } from '@/lib/errors';
import { runPrompt, speakText, transcribeAudio, voiceCapabilities } from '@/server/processing';
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
  // D'abord Whisper chez Groq (rapide, clés Groq) ; sans lui, Gemini ou l'IA locale lisent le son.
  const whisper = await transcribeAudio(bytes, 'audio/wav');
  if (whisper?.trim()) return ok({ text: whisper.trim() });
  const result = await runPrompt('transcribe', { fileName: 'dictee.wav' }, transcriptSchema, {
    files: [{ mimeType: 'audio/wav', data: bytes.toString('base64') }],
  });
  // Sans IA, la réponse préparée est vide : la dictée n'est pas possible.
  const text = result.ok && result.data.source === 'gemini' ? result.data.result.transcript : '';
  if (!text.trim()) return fail(ERRORS.AI_UNAVAILABLE);
  return ok({ text: text.trim() });
}

// Les boutons « Dicter » et « Écouter » demandent d'abord ce que la voix sait faire : sans clé Groq,
// Gemini ou ElevenLabs, ils se présentent comme indisponibles au lieu d'échouer après coup.
export async function voiceStatus(): Promise<{ dictate: boolean; speak: boolean }> {
  const capabilities = await voiceCapabilities();
  return { dictate: capabilities.audio, speak: capabilities.voice };
}

// Lire un texte à voix haute (ElevenLabs). Le MP3 revient en base64 ; `null` : voix indisponible,
// le bouton se rabat sur la voix du navigateur.
export async function speak(text: string): Promise<string | null> {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  const clean = text.trim().slice(0, 900);
  if (!clean) return null;
  const audio = await speakText(clean);
  return audio ? audio.toString('base64') : null;
}
