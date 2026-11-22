'use client';

import { LoaderCircle, Square, Volume2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { speak, voiceStatus } from '@/features/dictation/actions';

// Lit un texte à voix haute. Voie 1 : la voix d'ElevenLabs, via le serveur (même voix sur tous les
// postes, sans voix à installer). Voie 2, sans clé ElevenLabs : la voix française du navigateur
// (courante sur Mac, Windows et téléphone, souvent absente sous Linux). Le bouton n'apparaît que si
// l'une des deux voies existe.
export function SpeakButton({ text, label = 'Écouter' }: { text: string; label?: string }) {
  const [server, setServer] = useState(false);
  const [browser, setBrowser] = useState(false);
  const [state, setState] = useState<'idle' | 'loading' | 'speaking'>('idle');
  const audio = useRef<HTMLAudioElement | null>(null);
  const playback = useRef(0);

  useEffect(() => {
    let alive = true;
    voiceStatus().then((status) => alive && setServer(status.speak));
    const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
    // La liste des voix se charge après coup dans certains navigateurs : on l'écoute.
    const check = () =>
      setBrowser(synth?.getVoices().some((voice) => voice.lang.startsWith('fr')) ?? false);
    check();
    synth?.addEventListener('voiceschanged', check);
    return () => {
      alive = false;
      playback.current += 1;
      synth?.removeEventListener('voiceschanged', check);
      synth?.cancel();
      audio.current?.pause();
    };
  }, []);

  if (!server && !browser) return null;

  function stop() {
    playback.current += 1;
    audio.current?.pause();
    audio.current = null;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setState('idle');
  }

  function speakWithBrowser() {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.voice = synth.getVoices().find((voice) => voice.lang.startsWith('fr')) ?? null;
    utterance.onend = () => setState('idle');
    utterance.onerror = () => setState('idle');
    setState('speaking');
    synth.speak(utterance);
  }

  async function toggle() {
    if (state !== 'idle') {
      stop();
      return;
    }
    const request = ++playback.current;
    if (server) {
      setState('loading');
      const mp3 = await speak(text).catch(() => null);
      // Un passage au mode conversation démonte ce bouton : aucune lecture tardive dans le micro.
      if (request !== playback.current) return;
      if (mp3) {
        const player = new Audio(`data:audio/mpeg;base64,${mp3}`);
        audio.current = player;
        player.onended = () => setState('idle');
        player.onerror = () => setState('idle');
        setState('speaking');
        void player.play().catch(() => setState('idle'));
        return;
      }
    }
    // La voix du serveur est indisponible (clé épuisée, panne) : la voix du navigateur, si elle existe.
    if (browser) speakWithBrowser();
    else setState('idle');
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => void toggle()}
      aria-pressed={state === 'speaking'}
    >
      {state === 'loading' ? (
        <LoaderCircle aria-hidden className="animate-spin" />
      ) : state === 'speaking' ? (
        <Square aria-hidden />
      ) : (
        <Volume2 aria-hidden />
      )}
      {state === 'speaking' ? 'Arrêter' : label}
    </Button>
  );
}
