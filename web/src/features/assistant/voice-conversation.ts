export type VoicePhase = 'listening' | 'transcribing' | 'thinking' | 'speaking';

type Conversation = {
  record: (signal: AbortSignal) => Promise<Blob | null>;
  transcribe: (recording: Blob, signal: AbortSignal) => Promise<string>;
  answer: (question: string, signal: AbortSignal) => Promise<string | null>;
  speak: (answer: string, signal: AbortSignal) => Promise<void>;
  onPhase: (phase: VoicePhase) => void;
};

// Une seule étape à la fois : le micro est rendu avant de transcrire et reste éteint pendant
// la réponse. Chaque attente peut finir après la désactivation : vérifier l'annulation partout.
export async function runVoiceConversation(conversation: Conversation, signal: AbortSignal) {
  while (!signal.aborted) {
    conversation.onPhase('listening');
    const recording = await conversation.record(signal);
    if (signal.aborted) return;
    if (!recording) continue;
    conversation.onPhase('transcribing');
    const text = (await conversation.transcribe(recording, signal)).trim().slice(0, 600);
    if (signal.aborted) return;
    if (text.length < 2) continue;
    conversation.onPhase('thinking');
    const answer = await conversation.answer(text, signal);
    if (signal.aborted || !answer) return;
    conversation.onPhase('speaking');
    await conversation.speak(answer, signal);
  }
}
