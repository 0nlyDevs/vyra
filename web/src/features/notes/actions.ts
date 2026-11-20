'use server';

import { revalidatePath } from 'next/cache';
import { type ActionResult, fail, ok } from '@/lib/action-result';
import { ERRORS } from '@/lib/errors';
import { createNote, listNotes, searchNotes } from '@/server/dal/notes';
import { type AiSource, embedTexts, runPrompt } from '@/server/processing';
import { getCurrentProfile } from '@/server/session';
import { noteSchema, searchSchema, summarySchema } from './schema';

// Exemple complet d'une fonctionnalité : à copier pour la vraie, puis à supprimer.
// Toujours dans cet ordre : connexion → validation Zod → droits → action via la DAL.

export async function addNote(
  _previous: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  const profile = await getCurrentProfile();
  if (!profile) return fail(ERRORS.UNAUTHORIZED);
  const parsed = noteSchema.safeParse({ content: formData.get('content') });
  if (!parsed.success) return fail(ERRORS.VALIDATION_FAILED, parsed.error);

  // Sans IA, la note est quand même enregistrée (sans vecteur) : la démo continue.
  const vectors = await embedTexts([parsed.data.content]);
  await createNote({
    profileId: profile.id,
    content: parsed.data.content,
    embedding: vectors.ok ? (vectors.data[0] ?? null) : null,
  });
  revalidatePath('/dashboard');
  return ok(null);
}

export type SearchResult = {
  mode: 'meaning' | 'words';
  notes: { id: string; content: string }[];
};

export async function searchMyNotes(
  _previous: ActionResult<SearchResult> | null,
  formData: FormData,
): Promise<ActionResult<SearchResult>> {
  const profile = await getCurrentProfile();
  if (!profile) return fail(ERRORS.UNAUTHORIZED);
  const parsed = searchSchema.safeParse({ query: formData.get('query') });
  if (!parsed.success) return fail(ERRORS.VALIDATION_FAILED, parsed.error);

  const vectors = await embedTexts([parsed.data.query]);
  const queryEmbedding = vectors.ok ? (vectors.data[0] ?? null) : null;
  const found = await searchNotes(profile.id, parsed.data.query, queryEmbedding);
  return ok({
    mode: queryEmbedding ? 'meaning' : 'words',
    notes: found.map((note) => ({ id: note.id, content: note.content })),
  });
}

export type Summary = { summary: string; actions: string[]; source: AiSource };

export async function summarizeMyNotes(): Promise<ActionResult<Summary>> {
  const profile = await getCurrentProfile();
  if (!profile) return fail(ERRORS.UNAUTHORIZED);

  const myNotes = await listNotes(profile.id);
  if (myNotes.length === 0) return fail(ERRORS.NOT_FOUND);
  const result = await runPrompt(
    'summarize',
    { notes: myNotes.map((note) => note.content) },
    summarySchema,
  );
  if (!result.ok) return result;
  return ok({ ...result.data.result, source: result.data.source });
}
