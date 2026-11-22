import { speak } from '@/features/dictation/actions';

async function playAudio(mp3: string, signal: AbortSignal) {
  const player = new Audio(`data:audio/mpeg;base64,${mp3}`);
  await new Promise<void>((resolve, reject) => {
    const finish = (error?: Error) => {
      signal.removeEventListener('abort', abort);
      player.onended = null;
      player.onerror = null;
      player.pause();
      player.removeAttribute('src');
      if (error && !signal.aborted) reject(error);
      else resolve();
    };
    const abort = () => finish();
    player.onended = () => finish();
    player.onerror = () => finish(new Error('La réponse vocale n’a pas pu être lue.'));
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) return abort();
    void player.play().catch(() => finish(new Error('La lecture audio est bloquée.')));
  });
}

function speakWithBrowser(text: string, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return resolve();
    if (!('speechSynthesis' in window)) {
      reject(new Error('La lecture vocale est indisponible. Vous pouvez lire la réponse.'));
      return;
    }
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.voice = synth.getVoices().find((voice) => voice.lang.startsWith('fr')) ?? null;
    const finish = (error?: Error) => {
      signal.removeEventListener('abort', abort);
      utterance.onend = null;
      utterance.onerror = null;
      if (error && !signal.aborted) reject(error);
      else resolve();
    };
    const abort = () => {
      synth.cancel();
      finish();
    };
    utterance.onend = () => finish();
    utterance.onerror = () =>
      finish(new Error('La lecture vocale est indisponible dans ce navigateur.'));
    signal.addEventListener('abort', abort, { once: true });
    synth.speak(utterance);
  });
}

// Même priorité que le bouton Écouter : ElevenLabs, puis la voix française du navigateur.
export async function readVoiceAnswer(text: string, serverVoice: boolean, signal: AbortSignal) {
  const clean = text.replace(/\[(?:S)?\d+\]/g, '');
  if (signal.aborted) return;
  if (serverVoice) {
    const mp3 = await speak(clean).catch(() => null);
    if (signal.aborted) return;
    if (mp3) {
      try {
        await playAudio(mp3, signal);
        return;
      } catch {
        // La voix du navigateur reste utilisable si le lecteur MP3 échoue.
      }
    }
  }
  await speakWithBrowser(clean, signal);
}
