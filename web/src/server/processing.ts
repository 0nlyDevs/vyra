import 'server-only';
import { z } from 'zod';
import { type ActionResult, fail, ok } from '@/lib/action-result';
import { env } from '@/lib/env';
import { ERRORS } from '@/lib/errors';
import { logger } from '@/lib/logger';

// Seul point d'appel vers le service `processing` (FastAPI, même PC). Toute panne (service arrêté,
// délai dépassé, réponse inattendue) devient AI_UNAVAILABLE : jamais d'exception vers l'écran.

// Sous les 30 s : la personne attend la réponse, devant le jury (processing s'arrête à 20 s).
const TIMEOUT_MS = 25_000;

export type AiSource = 'gemini' | 'fallback';

async function post<T>(
  path: string,
  body: unknown,
  schema: z.ZodType<T>,
  timeoutMs = TIMEOUT_MS,
): Promise<T | null> {
  const started = Date.now();
  try {
    const response = await fetch(`${env.PROCESSING_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store',
    });
    if (!response.ok) {
      logger.warn('processing : réponse en erreur', { path, status: response.status });
      return null;
    }
    const parsed = schema.safeParse(await response.json());
    if (!parsed.success) {
      logger.warn('processing : réponse inattendue', { path });
      return null;
    }
    return parsed.data;
  } catch (error) {
    logger.warn('processing : appel impossible', {
      path,
      error: error instanceof Error ? error.name : 'unknown',
      durationMs: Date.now() - started,
    });
    return null;
  }
}

// Lance le prompt `processing/app/prompts/<name>.md`. `resultSchema` vérifie la forme du JSON
// renvoyé (par Gemini ou par la réponse de secours `fallbacks/<name>.json`).
export async function runPrompt<T>(
  name: string,
  payload: Record<string, unknown>,
  resultSchema: z.ZodType<T>,
): Promise<ActionResult<{ result: T; source: AiSource }>> {
  const schema = z.object({ result: resultSchema, source: z.enum(['gemini', 'fallback']) });
  const data = await post(`/v1/prompts/${encodeURIComponent(name)}`, { payload }, schema);
  return data ? ok(data) : fail(ERRORS.AI_UNAVAILABLE);
}

// La recherche web (presse, via GDELT) est lente : elle tourne après l'affichage de la page.
const WEB_SEARCH_TIMEOUT_MS = 90_000;

const webArticleSchema = z.object({
  url: z.string(),
  title: z.string(),
  site: z.string(),
  published_at: z.string().nullable(),
  excerpt: z.string(),
  language: z.string().nullable(),
});
export type WebArticle = z.infer<typeof webArticleSchema>;

// Articles de presse qui rapportent l'information. `source: 'fallback'` : recherche impossible.
export async function findWebSources(
  claim: string,
): Promise<ActionResult<{ articles: WebArticle[]; source: 'gdelt' | 'fallback' }>> {
  const schema = z.object({
    articles: z.array(webArticleSchema),
    source: z.enum(['gdelt', 'fallback']),
  });
  const data = await post('/v1/web-sources', { claim }, schema, WEB_SEARCH_TIMEOUT_MS);
  return data ? ok(data) : fail(ERRORS.AI_UNAVAILABLE);
}

// Un vecteur par texte (recherche par le sens). Hors ligne : AI_UNAVAILABLE.
export async function embedTexts(texts: string[]): Promise<ActionResult<number[][]>> {
  const schema = z.object({ vectors: z.array(z.array(z.number())) });
  const data = await post('/v1/embeddings', { texts }, schema);
  return data && data.vectors.length === texts.length
    ? ok(data.vectors)
    : fail(ERRORS.AI_UNAVAILABLE);
}
