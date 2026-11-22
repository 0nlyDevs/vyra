'use server';

import { createHash } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { type ActionResult, fail, ok } from '@/lib/action-result';
import type { CertaintyLevel, ScanOutcome } from '@/lib/domain';
import { type AppError, ERRORS } from '@/lib/errors';
import { formatDate } from '@/lib/format';
import { findJudgedCase } from '@/server/dal/court';
import {
  addScanEvidence,
  createCaseFromScan,
  createScan,
  findOldestVersion,
  getScan,
} from '@/server/dal/scans';
import type { Scan } from '@/server/db/schema';
import { demoVariantForMedia } from '@/server/demo/media';
import { demoVariantForCase } from '@/server/demo/variants';
import {
  embedTexts,
  inspectMedia,
  inspectVideo,
  makeSafeCopy,
  runPrompt,
} from '@/server/processing';
import { getCurrentProfile } from '@/server/session';
import {
  AUDIO_TYPES,
  addToCaseSchema,
  IMAGE_TYPES,
  imageMatchesSchema,
  MAX_FILE_BYTES,
  readingSchema,
  scanIdSchema,
  transcriptSchema,
  VIDEO_TYPES,
} from './schema';

// Le scan : ce que le fichier déclare, s'il a déjà été vu, ce qu'en lit l'IA. Jamais de verdict.
// Toujours dans cet ordre : connexion → validation → droits → action via la DAL.

export type ScanView = Pick<
  Scan,
  | 'id'
  | 'kind'
  | 'fileName'
  | 'report'
  | 'alreadySeen'
  | 'reading'
  | 'transcript'
  | 'outcome'
  | 'aiSource'
  | 'caseId'
> & {
  // Vocal : l'affaire déjà jugée qui ressemble au message, s'il y en a une.
  judged?: { id: string; title: string; certainty: CertaintyLevel | null } | null;
  // Image : la copie protégée lue par l'IA et proposée pour la recherche inversée. Pas gardée en base.
  safeCopy?: SafeCopyView | null;
  // Vidéo : les images clés protégées, lues par l'IA. Pas gardées en base.
  frames?: VideoFrameView[];
};

export type VideoFrameView = { second: number; dataUrl: string; facesBlurred: number };

export type SafeCopyView = {
  dataUrl: string;
  facesBlurred: number;
  metadataRemoved: boolean;
  firstFrameOnly: boolean;
};

function toView(scan: Scan): ScanView {
  return {
    id: scan.id,
    kind: scan.kind,
    fileName: scan.fileName,
    report: scan.report,
    alreadySeen: scan.alreadySeen,
    reading: scan.reading,
    transcript: scan.transcript,
    outcome: scan.outcome,
    aiSource: scan.aiSource,
    caseId: scan.caseId,
  };
}

type ReadFile =
  | { ok: true; file: File; bytes: Buffer; sha256: string }
  | { ok: false; error: AppError };

async function readUpload(formData: FormData, allowed: string[]): Promise<ReadFile> {
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, error: ERRORS.VALIDATION_FAILED };
  if (file.size > MAX_FILE_BYTES) return { ok: false, error: ERRORS.FILE_TOO_LARGE };
  if (!allowed.includes(file.type)) return { ok: false, error: ERRORS.FILE_NOT_SUPPORTED };
  const bytes = Buffer.from(await file.arrayBuffer());
  return { ok: true, file, bytes, sha256: createHash('sha256').update(bytes).digest('hex') };
}

function outcomeOf(aiSignature: boolean, alreadySeen: boolean, observations: number): ScanOutcome {
  if (aiSignature) return 'ai_signature';
  if (alreadySeen || observations > 0) return 'clues';
  return 'no_clue';
}

export async function analyzeImage(formData: FormData): Promise<ActionResult<ScanView>> {
  const profile = await getCurrentProfile();
  if (!profile) return fail(ERRORS.UNAUTHORIZED);
  const upload = await readUpload(formData, IMAGE_TYPES);
  if (!upload.ok) return fail(upload.error);
  let rawMatches: unknown = [];
  try {
    rawMatches = JSON.parse(String(formData.get('matches') ?? '[]'));
  } catch {
    rawMatches = [];
  }
  const matches = imageMatchesSchema.safeParse(rawMatches);
  if (!matches.success) return fail(ERRORS.VALIDATION_FAILED, matches.error);

  // « Déjà vue » : l'empreinte a été comparée dans le navigateur ; on garde la plus ancienne version.
  const alreadySeen = await findOldestVersion(matches.data);
  const fallbackVariant =
    (await demoVariantForMedia(upload.sha256)) ??
    (alreadySeen ? demoVariantForCase(alreadySeen.caseId) : undefined);
  const inline = { mimeType: upload.file.type, data: upload.bytes.toString('base64') };

  // L'original reste ici : seuls ses octets sont lus sur place (informations cachées). L'IA ne
  // reçoit que la copie protégée ; sans copie, pas de lecture par l'IA.
  const [report, copy] = await Promise.all([inspectMedia(inline), makeSafeCopy(inline)]);
  const reading = copy.ok
    ? await runPrompt('read-image', { fileName: upload.file.name }, readingSchema, {
        files: [{ mimeType: copy.data.mimeType, data: copy.data.data }],
        fallbackVariant,
      })
    : copy;
  const readingData = reading.ok ? reading.data.result : null;
  const scan = await createScan({
    profileId: profile.id,
    kind: 'image',
    fileName: upload.file.name,
    mimeType: upload.file.type,
    sha256: upload.sha256,
    report: report.ok ? report.data : null,
    alreadySeen,
    reading: readingData,
    outcome: outcomeOf(
      report.ok && report.data.aiSignature,
      alreadySeen !== null,
      readingData?.observations.length ?? 0,
    ),
    aiSource: reading.ok ? reading.data.source : 'fallback',
  });
  if (!scan) return fail(ERRORS.INTERNAL);
  return ok({
    ...toView(scan),
    safeCopy: copy.ok
      ? {
          dataUrl: `data:${copy.data.mimeType};base64,${copy.data.data}`,
          facesBlurred: copy.data.facesBlurred,
          metadataRemoved: copy.data.metadataRemoved,
          firstFrameOnly: copy.data.firstFrameOnly,
        }
      : null,
  });
}

export async function transcribeAudio(formData: FormData): Promise<ActionResult<ScanView>> {
  const profile = await getCurrentProfile();
  if (!profile) return fail(ERRORS.UNAUTHORIZED);
  const upload = await readUpload(formData, AUDIO_TYPES);
  if (!upload.ok) return fail(upload.error);

  const result = await runPrompt('transcribe', { fileName: upload.file.name }, transcriptSchema, {
    files: [{ mimeType: upload.file.type, data: upload.bytes.toString('base64') }],
    fallbackVariant: await demoVariantForMedia(upload.sha256),
  });
  // Une transcription vide veut dire : pas d'IA, et pas de réponse préparée pour ce fichier.
  const transcript = result.ok && result.data.result.transcript ? result.data.result : null;
  const scan = await createScan({
    profileId: profile.id,
    kind: 'audio',
    fileName: upload.file.name,
    mimeType: upload.file.type,
    sha256: upload.sha256,
    transcript,
    aiSource: result.ok ? result.data.source : 'fallback',
  });
  if (!scan) return fail(ERRORS.INTERNAL);

  return ok({ ...toView(scan), judged: await judgedFor(transcript) });
}

// Le message ressemble-t-il à une affaire déjà jugée ?
async function judgedFor(transcript: Scan['transcript']): Promise<ScanView['judged']> {
  const claim = transcript?.claim || transcript?.transcript;
  if (!claim) return null;
  const vectors = await embedTexts([claim]);
  const found = await findJudgedCase(claim, vectors.ok ? (vectors.data[0] ?? null) : null);
  return found ? { id: found.id, title: found.title, certainty: found.certainty } : null;
}

export async function analyzeVideo(formData: FormData): Promise<ActionResult<ScanView>> {
  const profile = await getCurrentProfile();
  if (!profile) return fail(ERRORS.UNAUTHORIZED);
  const upload = await readUpload(formData, VIDEO_TYPES);
  if (!upload.ok) return fail(upload.error);

  // ffmpeg, sans IA : ce que le fichier déclare, les images clés protégées, la bande son.
  const inspected = await inspectVideo({
    mimeType: upload.file.type,
    data: upload.bytes.toString('base64'),
  });
  if (!inspected.ok) return fail(inspected.error);
  const { report, frames, audio } = inspected.data;

  // L'IA ne reçoit jamais la vidéo d'origine : seulement les images protégées et le son.
  const fileName = upload.file.name;
  const fallbackVariant = await demoVariantForMedia(upload.sha256);
  const [reading, heard] = await Promise.all([
    frames.length > 0
      ? runPrompt(
          'read-video',
          { fileName, seconds: frames.map((frame) => frame.second) },
          readingSchema,
          {
            files: frames.map((frame) => ({ mimeType: frame.mimeType, data: frame.data })),
            fallbackVariant,
          },
        )
      : null,
    audio
      ? runPrompt('transcribe', { fileName }, transcriptSchema, {
          files: [{ mimeType: audio.mimeType, data: audio.data }],
          fallbackVariant,
        })
      : null,
  ]);
  const readingData = reading?.ok ? reading.data.result : null;
  const transcript = heard?.ok && heard.data.result.transcript ? heard.data.result : null;
  const answeredByAi = [reading, heard].some(
    (result) => result?.ok && result.data.source === 'gemini',
  );

  const scan = await createScan({
    profileId: profile.id,
    kind: 'video',
    fileName,
    mimeType: upload.file.type,
    sha256: upload.sha256,
    report,
    reading: readingData,
    transcript,
    outcome: outcomeOf(report.aiSignature, false, readingData?.observations.length ?? 0),
    aiSource: answeredByAi ? 'gemini' : 'fallback',
  });
  if (!scan) return fail(ERRORS.INTERNAL);
  return ok({
    ...toView(scan),
    judged: await judgedFor(transcript),
    frames: frames.map((frame) => ({
      second: frame.second,
      dataUrl: `data:${frame.mimeType};base64,${frame.data}`,
      facesBlurred: frame.facesBlurred,
    })),
  });
}

// Les indices du scan deviennent des pièces de l'affaire choisie. Ce sont des éléments de
// contexte : ils ne décident jamais seuls du niveau de certitude.
function piecesFromScan(scan: Scan) {
  const pieces: Parameters<typeof addScanEvidence>[2] = [];
  const isVideo = scan.kind === 'video';
  const origin = isVideo ? 'Scan de vidéo' : 'Scan d’image';
  const seen = scan.alreadySeen;
  if (seen) {
    const date = seen.publishedAt ? formatDate(new Date(seen.publishedAt)) : 'une date inconnue';
    pieces.push({
      title: 'Image déjà publiée',
      content: `La même image a été publiée le ${date} par ${seen.sourceName}.`,
      sourceName: 'Scan d’image : déjà vue',
      publishedAt: seen.publishedAt ? new Date(seen.publishedAt) : null,
      stance: 'context',
      strength: 'solid',
    });
  }
  if (scan.report?.aiSignature) {
    pieces.push({
      title: 'Signature IA dans le fichier',
      content: scan.report.findings.join(' '),
      sourceName: `${origin} : signature`,
      stance: 'context',
      strength: 'solid',
    });
  } else if (scan.report?.takenAt) {
    pieces.push({
      title: 'Date enregistrée dans le fichier',
      content: `Le fichier indique une prise de vue le ${formatDate(new Date(scan.report.takenAt))}. Cette date peut être modifiée.`,
      sourceName: `${origin} : informations du fichier`,
      stance: 'context',
      strength: 'weak',
    });
  }
  if (scan.reading && scan.reading.observations.length > 0) {
    pieces.push({
      title: isVideo ? 'Lecture de la vidéo par l’IA' : 'Lecture de l’image par l’IA',
      content: scan.reading.observations.join(' '),
      sourceName: `${origin} : lecture par l’IA`,
      stance: 'context',
      strength: 'weak',
    });
  }
  if (isVideo && scan.transcript) {
    pieces.push({
      title: 'Ce que dit la bande son',
      content: `Transcription par l’IA : « ${scan.transcript.transcript} »`,
      sourceName: 'Scan de vidéo : bande son',
      stance: 'context',
      strength: 'weak',
    });
  }
  return pieces;
}

export async function addScanToCase(
  scanId: string,
  caseId: string,
): Promise<ActionResult<{ caseId: string; added: number }>> {
  const profile = await getCurrentProfile();
  if (!profile) return fail(ERRORS.UNAUTHORIZED);
  const parsed = addToCaseSchema.safeParse({ scanId, caseId });
  if (!parsed.success) return fail(ERRORS.VALIDATION_FAILED, parsed.error);

  const scan = await getScan(parsed.data.scanId);
  if (!scan || scan.profileId !== profile.id) return fail(ERRORS.NOT_FOUND);
  const pieces = piecesFromScan(scan);
  if (pieces.length === 0) return fail(ERRORS.NOTHING_TO_ADD);

  const added = await addScanEvidence(scan.id, parsed.data.caseId, pieces);
  revalidatePath(`/cases/${parsed.data.caseId}`);
  revalidatePath(`/court/${parsed.data.caseId}`);
  return ok({ caseId: parsed.data.caseId, added });
}

// Un vocal (ou la bande son d'une vidéo) transcrit ouvre une affaire. Utilisé par le site (puis on
// part sur l'enquête) et par l'application mobile (`/api/v1/scans/:id/open-case`).
export async function openCaseFromScan(scanId: unknown): Promise<ActionResult<{ caseId: string }>> {
  const profile = await getCurrentProfile();
  if (!profile) return fail(ERRORS.UNAUTHORIZED);
  const parsed = scanIdSchema.safeParse({ scanId });
  if (!parsed.success) return fail(ERRORS.VALIDATION_FAILED, parsed.error);

  const scan = await getScan(parsed.data.scanId);
  if (!scan || scan.profileId !== profile.id || !scan.transcript) return fail(ERRORS.NOT_FOUND);
  const claim = scan.transcript.claim || scan.transcript.transcript;
  const words = claim.split(/\s+/).slice(0, 6).join(' ');
  const prefix = scan.kind === 'video' ? 'Vidéo' : 'Vocal';
  const caseId = await createCaseFromScan(scan.id, { title: `${prefix} : ${words}…`, claim });
  if (!caseId) return fail(ERRORS.INTERNAL);
  revalidatePath('/cases');
  revalidatePath('/dashboard');
  return ok({ caseId });
}

export async function openCaseFromAudio(formData: FormData) {
  const result = await openCaseFromScan(formData.get('scanId'));
  if (!result.ok && result.error.code === 'UNAUTHORIZED') redirect('/login');
  if (result.ok) redirect(`/cases/${result.data.caseId}`);
}
