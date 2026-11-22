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
      headers: {
        'Content-Type': 'application/json',
        ...(env.PROCESSING_TOKEN ? { 'X-Processing-Token': env.PROCESSING_TOKEN } : {}),
      },
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
  // Début du texte de la page et ses liens sortants : pour retrouver qui reprend qui.
  body: z.string().default(''),
  links: z.array(z.string()).default([]),
});
export type WebArticle = z.infer<typeof webArticleSchema>;

// Articles et messages qui rapportent l'information (Tavily, sinon GDELT), cherchés aussi avec
// les autres formulations `queries` (mots-clés, autres langues). `source: 'fallback'` : recherche
// impossible.
export async function findWebSources(
  claim: string,
  queries: string[] = [],
): Promise<ActionResult<{ articles: WebArticle[]; source: 'tavily' | 'gdelt' | 'fallback' }>> {
  const schema = z.object({
    articles: z.array(webArticleSchema),
    source: z.enum(['tavily', 'gdelt', 'fallback']),
  });
  const data = await post('/v1/web-sources', { claim, queries }, schema, WEB_SEARCH_TIMEOUT_MS);
  return data ? ok(data) : fail(ERRORS.AI_UNAVAILABLE);
}

// Titre, date, texte et liens de pages données (pour suivre les liens d'un article).
export async function readPages(urls: string[]): Promise<ActionResult<WebArticle[]>> {
  const schema = z.object({ articles: z.array(webArticleSchema) });
  const data = await post('/v1/pages', { urls }, schema, WEB_SEARCH_TIMEOUT_MS);
  return data ? ok(data.articles) : fail(ERRORS.WEB_SEARCH_UNAVAILABLE);
}

const factCheckSchema = z.object({
  url: z.string(),
  title: z.string(),
  publisher: z.string(),
  rating: z.string().nullable(),
  claim: z.string().nullable(),
  excerpt: z.string(),
  published_at: z.string().nullable(),
});
export type FactCheck = z.infer<typeof factCheckSchema>;

const wikipediaArticleSchema = z.object({
  url: z.string(),
  title: z.string(),
  language: z.string(),
  summary: z.string(),
});
export type WikipediaArticle = z.infer<typeof wikipediaArticleSchema>;

// Vérifications déjà publiées sur le sujet (rubriques de vérification, Fact Check Tools) et
// Wikipédia. `searched: false` : aucune recherche n'a pu se faire (hors ligne).
export async function findFactChecks(
  claim: string,
): Promise<
  ActionResult<{ fact_checks: FactCheck[]; wikipedia: WikipediaArticle[]; searched: boolean }>
> {
  const schema = z.object({
    fact_checks: z.array(factCheckSchema),
    wikipedia: z.array(wikipediaArticleSchema),
    searched: z.boolean(),
  });
  const data = await post('/v1/fact-checks', { claim }, schema, WEB_SEARCH_TIMEOUT_MS);
  return data ? ok(data) : fail(ERRORS.WEB_SEARCH_UNAVAILABLE);
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

const liveItemSchema = z.object({
  url: z.string(),
  text: z.string(),
  source_name: z.string(),
  title: z.string().nullable(),
  image_url: z.string().nullable(),
  published_at: z.string().nullable(),
  author: z.string().nullable(),
  reach: z.number().nullable(),
});
export type LiveItem = z.infer<typeof liveItemSchema>;

// Le fil d'actualité réel : dernières publications des sources données (processing en lit au
// plus pendant 35 s). Réseau coupé : `sources_read` à 0.
export async function readLiveFeed(
  sources: { type: string; target: string; name: string }[],
): Promise<ActionResult<{ items: LiveItem[]; sources_read: number }>> {
  const schema = z.object({ items: z.array(liveItemSchema), sources_read: z.number() });
  const data = await post('/v1/live-feed', { sources }, schema, WEB_SEARCH_TIMEOUT_MS);
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

const safeCopySchema = z.object({
  mimeType: z.literal('image/jpeg'),
  data: z.string().min(1),
  width: z.number().int(),
  height: z.number().int(),
  facesBlurred: z.number().int().min(0),
  metadataRemoved: z.boolean(),
  firstFrameOnly: z.boolean(),
});
export type SafeCopy = z.infer<typeof safeCopySchema>;

// La copie à envoyer à la place de l'original : visages floutés, informations cachées retirées.
// Sans IA. En cas d'échec, l'original ne doit partir nulle part.
export async function makeSafeCopy(file: InlineFile): Promise<ActionResult<SafeCopy>> {
  const data = await post('/v1/media/safe-copy', file, safeCopySchema);
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

// Ce que la voix sait faire en ce moment, lu sur /health : `audio` dit si un enregistrement peut être
// transcrit (Groq Whisper, Gemini ou l'IA locale), `voice` si ElevenLabs lit à voix haute. Panne ou
// réponse inattendue : tout est « indisponible ».
const healthSchema = z.object({
  audio: z.boolean().default(false),
  voice: z.boolean().default(false),
});

export type VoiceCapabilities = { audio: boolean; voice: boolean };

export async function voiceCapabilities(): Promise<VoiceCapabilities> {
  try {
    const response = await fetch(`${env.PROCESSING_URL}/health`, {
      signal: AbortSignal.timeout(3_000),
      cache: 'no-store',
    });
    const parsed = healthSchema.safeParse(await response.json());
    return parsed.success ? parsed.data : { audio: false, voice: false };
  } catch {
    return { audio: false, voice: false };
  }
}

const VOICE_TIMEOUT_MS = 40_000;

function processingHeaders(contentType: string): Record<string, string> {
  return {
    'Content-Type': contentType,
    ...(env.PROCESSING_TOKEN ? { 'X-Processing-Token': env.PROCESSING_TOKEN } : {}),
  };
}

// Dictée : le texte dit dans l'enregistrement (Groq Whisper). `null` : indisponible, l'appelant peut
// essayer une autre voie.
export async function transcribeAudio(bytes: Buffer, mimeType: string): Promise<string | null> {
  try {
    const response = await fetch(`${env.PROCESSING_URL}/v1/transcribe`, {
      method: 'POST',
      headers: processingHeaders(mimeType),
      body: new Uint8Array(bytes),
      signal: AbortSignal.timeout(VOICE_TIMEOUT_MS),
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const parsed = z.object({ text: z.string() }).safeParse(await response.json());
    return parsed.success ? parsed.data.text : null;
  } catch {
    return null;
  }
}

// Lecture à voix haute : un MP3 (ElevenLabs), ou `null` si la voix n'est pas disponible.
export async function speakText(text: string): Promise<Buffer | null> {
  try {
    const response = await fetch(`${env.PROCESSING_URL}/v1/speech`, {
      method: 'POST',
      headers: processingHeaders('application/json'),
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(VOICE_TIMEOUT_MS),
      cache: 'no-store',
    });
    return response.ok ? Buffer.from(await response.arrayBuffer()) : null;
  } catch {
    return null;
  }
}
