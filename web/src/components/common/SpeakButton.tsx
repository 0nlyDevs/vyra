'use client';

import { Square, Volume2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

// Lit un texte à voix haute avec la voix française du navigateur (hors ligne sur Mac).
// Invisible si le navigateur ne sait pas lire à voix haute.
export function SpeakButton({ text, label = 'Écouter' }: { text: string; label?: string }) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    setSupported('speechSynthesis' in window);
    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  if (!supported) return null;

  function toggle() {
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.voice = synth.getVoices().find((voice) => voice.lang.startsWith('fr')) ?? null;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(utterance);
  }

  return (
    <Button type="button" variant="ghost" size="sm" onClick={toggle} aria-pressed={speaking}>
      {speaking ? <Square aria-hidden /> : <Volume2 aria-hidden />}
      {speaking ? 'Arrêter' : label}
    </Button>
  );
}
