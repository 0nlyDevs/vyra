import 'server-only';
import { z } from 'zod';
import { type ActionResult, fail, ok } from '@/lib/action-result';
import { env } from '@/lib/env';
import { ERRORS } from '@/lib/errors';
import { logger } from '@/lib/logger';

// Seul point d'appel vers le service `processing` (FastAPI, même PC). Toute panne (service arrêté,
// délai dépassé, réponse inattendue) devient AI_UNAVAILABLE : jamais d'exception vers l'écran.

// Plus long que le délai de processing (20 s avec Gemini, 60 s avec l'IA locale, dont le premier
// appel charge le modèle en mémoire) : processing renvoie la réponse de secours avant.
const TIMEOUT_MS = 65_000;

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

// Un fichier joint à un prompt (image ou son), en base64.
export type InlineFile = { mimeType: string; data: string };

export type PromptOptions = {
  // Image ou son lu par le modèle avec la consigne.
  files?: InlineFile[];
  // Réponse de secours propre à un cas de démo : `fallbacks/<name>--<variante>.json`.
  fallbackVariant?: string;
};

// Lance le prompt `processing/app/prompts/<name>.md`. `resultSchema` vérifie la forme du JSON
// renvoyé (par l'IA ou par la réponse de secours `fallbacks/<name>.json`).
// `source` vaut « gemini » quand un modèle a répondu (Gemini ou le modèle local).
export async function runPrompt<T>(
  name: string,
  payload: Record<string, unknown>,
  resultSchema: z.ZodType<T>,
  options: PromptOptions = {},
): Promise<ActionResult<{ result: T; source: AiSource }>> {
  const schema = z.object({ result: resultSchema, source: z.enum(['gemini', 'fallback']) });
  const body = { payload, files: options.files ?? [], fallbackVariant: options.fallbackVariant };
  const data = await post(`/v1/prompts/${encodeURIComponent(name)}`, body, schema);
  return data ? ok(data) : fail(ERRORS.AI_UNAVAILABLE);
}

// La recherche web peut être lente (GDELT sans clé Tavily) : elle tourne après l'affichage.
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

// Articles et messages qui rapportent l'information (Tavily, sinon GDELT).
// `source: 'fallback'` : recherche impossible.
export async function findWebSources(
  claim: string,
): Promise<ActionResult<{ articles: WebArticle[]; source: 'tavily' | 'gdelt' | 'fallback' }>> {
  const schema = z.object({
    articles: z.array(webArticleSchema),
    source: z.enum(['tavily', 'gdelt', 'fallback']),
  });
  const data = await post('/v1/web-sources', { claim }, schema, WEB_SEARCH_TIMEOUT_MS);
  return data ? ok(data) : fail(ERRORS.AI_UNAVAILABLE);
}

const newsItemSchema = z.object({
  url: z.string(),
  title: z.string(),
  summary: z.string(),
  published_at: z.string().nullable(),
  source_name: z.string(),
});
export type NewsItem = z.infer<typeof newsItemSchema>;

// Les derniers articles des flux RSS donnés (index de presse). Réseau coupé : `feeds_read` à 0.
export async function readNewsFeeds(
  feeds: { url: string; name: string }[],
): Promise<ActionResult<{ items: NewsItem[]; feeds_read: number }>> {
  const schema = z.object({ items: z.array(newsItemSchema), feeds_read: z.number() });
  const data = await post('/v1/news-feeds', { feeds }, schema, WEB_SEARCH_TIMEOUT_MS);
  return data ? ok(data) : fail(ERRORS.WEB_SEARCH_UNAVAILABLE);
}

const mediaReportSchema = z.object({
  format: z.string(),
  aiSignature: z.boolean(),
  generator: z.string().nullable(),
  c2pa: z.boolean(),
  aiSourceType: z.boolean(),
  stripped: z.boolean(),
  takenAt: z.string().nullable(),
  camera: z.string().nullable(),
  software: z.string().nullable(),
  gps: z.boolean(),
  findings: z.array(z.string()),
});

// Ce qu'une image déclare sur elle-même (signature, appareil, date). Sans IA : marche hors ligne.
export async function inspectMedia(
  file: InlineFile,
): Promise<ActionResult<z.infer<typeof mediaReportSchema>>> {
  const data = await post('/v1/media/inspect', file, mediaReportSchema);
  return data ? ok(data) : fail(ERRORS.INTERNAL);
}

// Un vecteur par texte (recherche par le sens). Hors ligne : AI_UNAVAILABLE.
export async function embedTexts(texts: string[]): Promise<ActionResult<number[][]>> {
  const schema = z.object({ vectors: z.array(z.array(z.number())) });
  const data = await post('/v1/embeddings', { texts }, schema);
  return data && data.vectors.length === texts.length
    ? ok(data.vectors)
    : fail(ERRORS.AI_UNAVAILABLE);
}
