'use client';

import { LoaderCircle, Mic, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { dictate, voiceStatus } from './actions';
import { recordSpeech } from './recording';
import { toWav } from './wav';

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
  const session = useRef<AbortController | null>(null);
  const onTextRef = useRef(onText);
  // `null` : on ne sait pas encore. `false` : aucune IA ne peut lire le son (pas de clé Gemini).
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => () => session.current?.abort(), []);
  useEffect(() => {
    onTextRef.current = onText;
  }, [onText]);
  useEffect(() => {
    let alive = true;
    voiceStatus().then((status) => alive && setAvailable(status.dictate));
    return () => {
      alive = false;
    };
  }, []);

  async function start() {
    if (session.current) return;
    const controller = new AbortController();
    session.current = controller;
    setPhase('listening');
    try {
      const recording = await recordSpeech(controller.signal, (stop) => {
        stopRef.current = stop;
      });
      stopRef.current = null;
      if (controller.signal.aborted) return;
      if (!recording) {
        toast.info('Rien entendu. Réessayez en parlant près du micro.');
        return;
      }
      setPhase('transcribing');
      const wav = await toWav(recording);
      if (controller.signal.aborted) return;
      const formData = new FormData();
      formData.set('audio', new File([wav], 'dictee.wav', { type: 'audio/wav' }));
      const result = await dictate(formData);
      if (controller.signal.aborted) return;
      if (result.ok) onTextRef.current(result.data.text);
      else toast.error(`Dictée impossible : ${result.error.message}`);
    } catch (cause) {
      if (!controller.signal.aborted)
        toast.error(cause instanceof Error ? cause.message : 'Dictée impossible.');
    } finally {
      if (session.current === controller) {
        session.current = null;
        stopRef.current = null;
        if (!controller.signal.aborted) setPhase('idle');
      }
    }
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
        if (phase === 'listening') {
          if (stopRef.current) stopRef.current();
          else {
            session.current?.abort();
            session.current = null;
            setPhase('idle');
          }
        } else void start();
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
