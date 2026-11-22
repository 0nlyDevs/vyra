'use client';

import { Square, Volume2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

// Lit un texte à voix haute avec la voix française du navigateur (hors ligne sur Mac).
// Invisible si le navigateur ne sait pas lire à voix haute ou n'a aucune voix française (c'est
// courant sous Linux : sans voix installée, le bouton ne ferait rien).
export function SpeakButton({ text, label = 'Écouter' }: { text: string; label?: string }) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    // La liste des voix se charge après coup dans certains navigateurs : on l'écoute.
    const check = () =>
      setSupported(synth.getVoices().some((voice) => voice.lang.startsWith('fr')));
    check();
    synth.addEventListener('voiceschanged', check);
    return () => {
      synth.removeEventListener('voiceschanged', check);
      synth.cancel();
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
