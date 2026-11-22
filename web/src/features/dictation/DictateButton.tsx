'use client';

import { LoaderCircle, Mic, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { dictate, voiceStatus } from './actions';
import { toWav } from './wav';

// Seuil de volume au-dessus duquel on considère que la personne parle (0 à 1).
const SPEECH_LEVEL = 0.04;
// Après avoir parlé, ce silence arrête l'écoute tout seul.
const SILENCE_MS = 1_200;
// Sans aucune parole pendant ce temps, on abandonne.
const NO_SPEECH_MS = 8_000;
const MAX_MS = 60_000;

const UNAVAILABLE =
  'Dictée indisponible : il faut une clé Groq (ou Gemini) pour transcrire la voix.';

type Phase = 'idle' | 'listening' | 'transcribing';

// Dicter au lieu de taper : le micro s'ouvre au clic, s'arrête seul après un silence, et le texte
// entendu est remis au champ (`onText`). Le micro est rendu à chaque fois.
export function DictateButton({
  onText,
  className,
}: {
  onText: (text: string) => void;
  className?: string;
}) {
  const [phase, setPhase] = useState<Phase>('idle');
  const stopRef = useRef<(() => void) | null>(null);
  // `null` : on ne sait pas encore. `false` : aucune IA ne peut lire le son (pas de clé Gemini).
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => () => stopRef.current?.(), []);
  useEffect(() => {
    let alive = true;
    voiceStatus().then((status) => alive && setAvailable(status.dictate));
    return () => {
      alive = false;
    };
  }, []);

  async function start() {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error('Micro inaccessible : autorisez-le dans le navigateur.');
      return;
    }
    const recorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    const context = new AudioContext();
    const analyser = context.createAnalyser();
    context.createMediaStreamSource(stream).connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    const startedAt = Date.now();
    let spokeAt = 0;
    let frame = 0;

    const stop = () => {
      cancelAnimationFrame(frame);
      stopRef.current = null;
      if (recorder.state !== 'inactive') recorder.stop();
    };
    stopRef.current = stop;

    const watch = () => {
      analyser.getFloatTimeDomainData(samples);
      const level = Math.sqrt(
        samples.reduce((sum, value) => sum + value * value, 0) / samples.length,
      );
      const now = Date.now();
      if (level > SPEECH_LEVEL) spokeAt = now;
      const silentAfterSpeech = spokeAt > 0 && now - spokeAt > SILENCE_MS;
      const neverSpoke = spokeAt === 0 && now - startedAt > NO_SPEECH_MS;
      if (silentAfterSpeech || neverSpoke || now - startedAt > MAX_MS) {
        stop();
        return;
      }
      frame = requestAnimationFrame(watch);
    };

    recorder.ondataavailable = (event) => chunks.push(event.data);
    recorder.onstop = async () => {
      for (const track of stream.getTracks()) track.stop();
      void context.close();
      if (spokeAt === 0) {
        setPhase('idle');
        toast.info('Rien entendu. Réessayez en parlant près du micro.');
        return;
      }
      setPhase('transcribing');
      try {
        const wav = await toWav(new Blob(chunks, { type: recorder.mimeType }));
        const formData = new FormData();
        formData.set('audio', new File([wav], 'dictee.wav', { type: 'audio/wav' }));
        const result = await dictate(formData);
        if (result.ok) onText(result.data.text);
        else toast.error(`Dictée impossible : ${result.error.message}`);
      } catch {
        toast.error('Dictée impossible : l’enregistrement n’a pas pu être lu.');
      } finally {
        setPhase('idle');
      }
    };

    recorder.start();
    setPhase('listening');
    frame = requestAnimationFrame(watch);
  }

  const label =
    phase === 'listening'
      ? 'Arrêter l’écoute'
      : phase === 'transcribing'
        ? 'Transcription en cours'
        : 'Dicter';

  return (
    <Button
      type="button"
      variant={phase === 'listening' ? 'default' : 'outline'}
      size="sm"
      className={cn('justify-self-start', available === false && 'opacity-50', className)}
      disabled={phase === 'transcribing'}
      aria-disabled={available === false || undefined}
      title={available === false ? UNAVAILABLE : undefined}
      onClick={() => {
        if (available === false) {
          toast.info(UNAVAILABLE);
          return;
        }
        if (phase === 'listening') stopRef.current?.();
        else void start();
      }}
      aria-label={label}
    >
      {phase === 'transcribing' ? (
        <LoaderCircle aria-hidden className="animate-spin" />
      ) : phase === 'listening' ? (
        <Square aria-hidden />
      ) : (
        <Mic aria-hidden />
      )}
      {phase === 'listening'
        ? 'Je vous écoute…'
        : phase === 'transcribing'
          ? 'Je transcris…'
          : 'Dicter'}
    </Button>
  );
}

// Ajoute le texte dicté à la suite de ce qui est déjà écrit.
export function appendText(current: string, dictated: string) {
  return current.trim() ? `${current.trim()} ${dictated}` : dictated;
}
