'use client';

import { ArrowRight, Gavel } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { AiReading } from '@/components/common/AiReading';
import { AiSourceBadge, CertaintyBadge } from '@/components/common/DomainBadges';
import { FileDrop } from '@/components/common/FileDrop';
import { SpeechBubble } from '@/components/common/SpeechBubble';
import { ToneBadge } from '@/components/common/ToneBadge';
import { FormMessage } from '@/components/form/FormField';
import { ErrorState, LoadingState } from '@/components/states/States';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { openCaseFromAudio, type ScanView, transcribeAudio } from './actions';
import { AUDIO_TYPES } from './schema';

const ENTER =
  'animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:slide-in-from-bottom-0';

const DEMO_AUDIO = { label: 'Vocal reçu de Tantine', path: '/demo/vocal-coupure-eau.wav' };

function AudioResult({ scan }: { scan: ScanView }) {
  const { transcript, judged } = scan;
  if (!transcript) {
    return (
      <ErrorState
        title="La transcription demande l’IA."
        description="L’IA ne répond pas et ce vocal n’a pas de réponse préparée. Vérifiez l’IA, puis réessayez."
      />
    );
  }
  return (
    <div className="grid gap-4" aria-live="polite">
      <AiReading label="Transcription par l’IA" className={ENTER}>
        <SpeechBubble speaker="Message vocal" caption={transcript.language || undefined}>
          {transcript.transcript}
        </SpeechBubble>
        {transcript.translation && (
          <p className="text-pretty text-muted-foreground">Traduction : {transcript.translation}</p>
        )}
        <div className="grid gap-1 rounded-xl bg-muted p-4">
          <p className="font-semibold">L’information à vérifier</p>
          <p className="text-pretty">{transcript.claim || transcript.transcript}</p>
        </div>
        {scan.aiSource && <AiSourceBadge source={scan.aiSource} />}
      </AiReading>
      {judged && (
        <div
          className={cn(
            'grid gap-2 rounded-xl border border-foreground bg-raised p-4 [animation-delay:160ms]',
            ENTER,
          )}
        >
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
      <div className="flex flex-wrap items-center gap-3">
        <form action={openCaseFromAudio}>
          <input type="hidden" name="scanId" value={scan.id} />
          <Button type="submit" variant={judged ? 'outline' : 'default'}>
            Envoyer dans une enquête
            <ArrowRight aria-hidden data-icon="inline-end" />
          </Button>
        </form>
      </div>
    </div>
  );
}

export function AudioScanner() {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ScanView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(
    () => () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    },
    [audioUrl],
  );

  function transcribe(file: File) {
    setError(null);
    setResult(null);
    setAudioUrl(URL.createObjectURL(file));
    startTransition(async () => {
      const formData = new FormData();
      formData.set('file', file);
      const response = await transcribeAudio(formData);
      if (response.ok) setResult(response.data);
      else setError(response.error.message);
    });
  }

  async function loadDemo() {
    const response = await fetch(DEMO_AUDIO.path);
    const blob = await response.blob();
    transcribe(new File([blob], 'vocal-coupure-eau.wav', { type: 'audio/wav' }));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="grid content-start gap-4">
        <FileDrop
          accept={AUDIO_TYPES.join(',')}
          label="Déposez un vocal, ou cliquez pour le choisir"
          hint="WAV, MP3, OGG ou M4A, 8 Mo au plus"
          onFile={transcribe}
          disabled={pending}
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-sm">Essayer avec :</span>
          <Button variant="secondary" size="sm" disabled={pending} onClick={loadDemo}>
            {DEMO_AUDIO.label}
          </Button>
        </div>
        {audioUrl && (
          // biome-ignore lint/a11y/useMediaCaption: vocal importé par la personne, la transcription s'affiche à côté.
          <audio controls src={audioUrl} className="w-full" />
        )}
      </div>
      <div className="grid content-start gap-4">
        <FormMessage message={error} />
        {pending && <LoadingState title="Transcription du vocal…" />}
        {result && !pending && <AudioResult scan={result} />}
        {!result && !pending && !error && (
          <p className="rounded-xl border border-dashed p-6 text-muted-foreground">
            Le vocal est transcrit, l’information principale est extraite, puis comparée aux
            affaires déjà jugées. On peut ensuite l’envoyer dans une enquête.
          </p>
        )}
      </div>
    </div>
  );
}
