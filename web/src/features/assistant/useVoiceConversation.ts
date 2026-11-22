'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { dictate, voiceStatus } from '@/features/dictation/actions';
import { canRecordSpeech, recordSpeech } from '@/features/dictation/recording';
import { toWav } from '@/features/dictation/wav';
import { runVoiceConversation, type VoicePhase } from './voice-conversation';
import { readVoiceAnswer } from './voice-playback';

export function useVoiceConversation(
  open: boolean,
  onQuestion: (text: string, signal: AbortSignal) => Promise<string | null>,
) {
  const [active, setActive] = useState(false);
  const [phase, setPhase] = useState<VoicePhase>('listening');
  const [error, setError] = useState<string | null>(null);
  const session = useRef<AbortController | null>(null);
  // Les callbacks de la boucle lisent la page et l'historique du dernier rendu validé.
  const answer = useEffectEvent(onQuestion);

  function stop() {
    session.current?.abort();
    setActive(false);
  }

  useEffect(() => {
    if (!active || !open) return;
    const controller = new AbortController();
    const { signal } = controller;
    session.current = controller;
    setError(null);
    setPhase('listening');
    async function converse() {
      if (!canRecordSpeech())
        throw new Error('Ce navigateur ne permet pas la conversation vocale.');
      const capabilities = await voiceStatus();
      if (signal.aborted) return;
      if (!capabilities.dictate)
        throw new Error('La dictée est momentanément indisponible. Réessayez plus tard.');
      await runVoiceConversation(
        {
          record: recordSpeech,
          transcribe: async (recording) => {
            const wav = await toWav(recording);
            if (signal.aborted) return '';
            const formData = new FormData();
            formData.set('audio', new File([wav], 'dictee.wav', { type: 'audio/wav' }));
            const result = await dictate(formData);
            if (!result.ok) throw new Error(result.error.message);
            return result.data.text;
          },
          answer,
          speak: (text) => readVoiceAnswer(text, capabilities.speak, signal),
          onPhase: setPhase,
        },
        signal,
      );
    }
    void converse()
      .catch((cause: unknown) => {
        if (!signal.aborted) {
          setError(
            cause instanceof Error ? cause.message : 'La conversation vocale a été interrompue.',
          );
        }
      })
      .finally(() => {
        if (!signal.aborted) setActive(false);
      });
    return () => controller.abort();
  }, [active, open]);

  return {
    active,
    phase,
    error,
    start: () => setActive(true),
    stop,
  };
}
