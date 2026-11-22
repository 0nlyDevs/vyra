'use client';

import { ArrowRight, AudioLines, Download, FileSearch, Film, Gavel, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { AiReading } from '@/components/common/AiReading';
import { AiSourceBadge, CertaintyBadge } from '@/components/common/DomainBadges';
import { FileDrop } from '@/components/common/FileDrop';
import { SpeechBubble } from '@/components/common/SpeechBubble';
import { ToneBadge } from '@/components/common/ToneBadge';
import { FormMessage } from '@/components/form/FormField';
import { LoadingState } from '@/components/states/States';
import { Button } from '@/components/ui/button';
import { SCAN_OUTCOME_DESCRIPTIONS, SCAN_OUTCOME_LABELS, SCAN_OUTCOME_TONES } from '@/lib/domain';
import { cn } from '@/lib/utils';
import { analyzeVideo, openCaseFromAudio, type ScanView } from './actions';
import { AddToCase, type CaseOption, ENTER, ReverseSearchServices, Step } from './ImageScanner';
import { VIDEO_TYPES } from './schema';

const DEMO_VIDEO = { label: 'Vidéo reçue par message', path: '/demo/video-coupure-eau.mp4' };

function formatSecond(second: number) {
  const whole = Math.round(second);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

function Keyframes({ scan }: { scan: ScanView }) {
  const frames = scan.frames ?? [];
  if (frames.length === 0) {
    return <p className="text-muted-foreground">Aucune image n’a pu être tirée de la vidéo.</p>;
  }
  const blurred = frames.reduce((total, frame) => total + frame.facesBlurred, 0);
  const base = scan.fileName.replace(/\.[^.]+$/, '') || 'video';
  return (
    <>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {frames.map((frame) => (
          <li key={frame.second} className="grid gap-1">
            {/* biome-ignore lint/performance/noImgElement: data URL produite à la volée, rien à optimiser */}
            <img
              src={frame.dataUrl}
              alt={`La vidéo à ${formatSecond(frame.second)}, visages floutés`}
              className="aspect-video w-full rounded-lg bg-muted object-cover"
            />
            <a
              href={frame.dataUrl}
              download={`${base}-${formatSecond(frame.second).replace(':', 'm')}s.jpg`}
              className="inline-flex items-center gap-1 text-muted-foreground text-xs underline-offset-4 hover:underline"
            >
              <Download aria-hidden className="size-3.5" />à {formatSecond(frame.second)}
            </a>
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground text-sm text-pretty">
        Images protégées :{' '}
        {blurred === 0
          ? 'aucun visage repéré'
          : `${blurred} visage${blurred > 1 ? 's floutés' : ' flouté'}`}
        , sans information cachée. Déposez-en une sur l’un de ces services : la page la plus
        ancienne qui la montre dit souvent d’où vient la vidéo. Aucun résultat ne prouve rien.
      </p>
      <ReverseSearchServices />
    </>
  );
}

function Soundtrack({ scan }: { scan: ScanView }) {
  const { transcript, judged } = scan;
  if (!transcript) {
    return (
      <section className={cn('grid gap-2 surface p-4 [animation-delay:240ms]', ENTER)}>
        <h3 className="flex items-center gap-2 font-semibold">
          <AudioLines aria-hidden className="size-5 text-primary" />
          4. La bande son
        </h3>
        <p className="text-muted-foreground">Pas de parole transcrite dans cette vidéo.</p>
      </section>
    );
  }
  return (
    <>
      <AiReading
        label="Transcription par l’IA"
        showLabel={false}
        className={cn('gap-3 [animation-delay:240ms]', ENTER)}
      >
        <h3 className="flex items-center gap-2 font-semibold">
          <AudioLines aria-hidden className="size-5 text-primary" />
          4. La bande son, transcrite par l’IA
        </h3>
        <SpeechBubble speaker="Dans la vidéo" caption={transcript.language || undefined}>
          {transcript.transcript}
        </SpeechBubble>
        {transcript.translation && (
          <p className="text-pretty text-muted-foreground">Traduction : {transcript.translation}</p>
        )}
        <div className="grid gap-1 rounded-xl bg-muted p-4">
          <p className="font-semibold">L’information à vérifier</p>
          <p className="text-pretty">{transcript.claim || transcript.transcript}</p>
        </div>
      </AiReading>
      {judged && (
        <div className="grid gap-2 rounded-xl border border-foreground bg-raised p-4">
          <div className="flex flex-wrap items-center gap-2">
            <ToneBadge tone="info">Déjà jugé</ToneBadge>
            <span className="font-medium">{judged.title}</span>
            {judged.certainty && <CertaintyBadge level={judged.certainty} />}
          </div>
          <Button asChild size="sm" className="justify-self-start">
            <Link href={`/court/${judged.id}`}>
              <Gavel aria-hidden />
              Voir l’audience
            </Link>
          </Button>
        </div>
      )}
      <form action={openCaseFromAudio}>
        <input type="hidden" name="scanId" value={scan.id} />
        <Button type="submit" variant={judged ? 'outline' : 'default'}>
          Envoyer dans une enquête
          <ArrowRight aria-hidden data-icon="inline-end" />
        </Button>
      </form>
    </>
  );
}

function VideoResult({ scan, caseOptions }: { scan: ScanView; caseOptions: CaseOption[] }) {
  const { report, reading, outcome } = scan;
  return (
    <div className="grid gap-4" aria-live="polite">
      {outcome && (
        <div className={cn('grid gap-1 rounded-xl bg-muted p-4', ENTER)}>
          <ToneBadge tone={SCAN_OUTCOME_TONES[outcome]} className="justify-self-start text-sm">
            {SCAN_OUTCOME_LABELS[outcome]}
          </ToneBadge>
          <p className="text-pretty">{SCAN_OUTCOME_DESCRIPTIONS[outcome]}</p>
        </div>
      )}

      <Step
        index={0}
        icon={<FileSearch aria-hidden className="size-5 text-primary" />}
        title="Ce que dit le fichier"
      >
        {report ? (
          <ul className="grid list-disc gap-1 pl-5">
            {report.findings.map((finding) => (
              <li key={finding}>{finding}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">Le fichier n’a pas pu être lu.</p>
        )}
      </Step>

      <Step
        index={1}
        icon={<Film aria-hidden className="size-5 text-primary" />}
        title="Images clés"
      >
        <Keyframes scan={scan} />
      </Step>

      <Step
        index={2}
        icon={<Sparkles aria-hidden className="size-5 text-primary" />}
        title="Lecture par l’IA"
        ai
      >
        {reading?.description && <p className="text-pretty">{reading.description}</p>}
        {reading && reading.observations.length > 0 ? (
          <ul className="grid list-disc gap-1 pl-5">
            {reading.observations.map((observation) => (
              <li key={observation}>{observation}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">
            {reading ? 'Aucune bizarrerie visible relevée.' : 'L’IA n’a pas lu ces images.'}
          </p>
        )}
        {reading?.textInImage && (
          <p className="text-sm">
            Texte dans la vidéo : <span className="italic">« {reading.textInImage} »</span>
          </p>
        )}
        <p className="text-muted-foreground text-sm">
          L’IA a lu les images protégées et la bande son, jamais la vidéo d’origine.
        </p>
        {scan.aiSource && <AiSourceBadge source={scan.aiSource} />}
      </Step>

      <Soundtrack scan={scan} />
      <AddToCase scan={scan} caseOptions={caseOptions} />
    </div>
  );
}

export function VideoScanner({
  caseOptions,
  available,
}: {
  caseOptions: CaseOption[];
  available: boolean;
}) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ScanView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(
    () => () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    },
    [videoUrl],
  );

  function analyze(file: File) {
    setError(null);
    setResult(null);
    setVideoUrl(URL.createObjectURL(file));
    startTransition(async () => {
      const formData = new FormData();
      formData.set('file', file);
      const response = await analyzeVideo(formData);
      if (response.ok) setResult(response.data);
      else setError(response.error.message);
    });
  }

  async function loadDemo() {
    const response = await fetch(DEMO_VIDEO.path);
    const blob = await response.blob();
    analyze(new File([blob], 'video-coupure-eau.mp4', { type: 'video/mp4' }));
  }

  if (!available) {
    return (
      <p className="rounded-xl border border-dashed p-6 text-muted-foreground text-pretty">
        L’examen des vidéos n’est pas disponible sur ce serveur : il demande ffmpeg à côté du
        service d’analyse. Les autres onglets fonctionnent normalement.
      </p>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="grid content-start gap-4">
        <FileDrop
          accept={VIDEO_TYPES.join(',')}
          label="Déposez une vidéo, ou cliquez pour la choisir"
          hint="MP4, MOV, WebM ou 3GP, 8 Mo au plus"
          onFile={analyze}
          disabled={pending}
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-sm">Essayer avec :</span>
          <Button variant="secondary" size="sm" disabled={pending} onClick={loadDemo}>
            {DEMO_VIDEO.label}
          </Button>
        </div>
        {videoUrl && (
          // biome-ignore lint/a11y/useMediaCaption: vidéo importée par la personne, sa bande son est transcrite à côté.
          <video controls src={videoUrl} className="w-full rounded-xl bg-muted" />
        )}
      </div>
      <div className="grid content-start gap-4">
        <FormMessage message={error} />
        {pending && <LoadingState title="Examen de la vidéo…" />}
        {result && !pending && <VideoResult scan={result} caseOptions={caseOptions} />}
        {!result && !pending && !error && (
          <p className="rounded-xl border border-dashed p-6 text-muted-foreground text-pretty">
            Ce que le fichier déclare, quatre images clés (visages floutés) à chercher sur le web,
            la lecture de ces images par l’IA et la transcription de la bande son. La vidéo
            d’origine ne part nulle part.
          </p>
        )}
      </div>
    </div>
  );
}
