// Une prise de parole, arrêtée après 1,2 s de silence. Partagée entre la dictée ponctuelle
// et la conversation vocale ; l'annulation rend le micro sans transcrire l'enregistrement.
export function canRecordSpeech() {
  return (
    typeof window !== 'undefined' &&
    'MediaRecorder' in window &&
    'AudioContext' in window &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

export async function recordSpeech(
  signal: AbortSignal,
  onReady?: (stop: () => void) => void,
): Promise<Blob | null> {
  if (!canRecordSpeech()) throw new Error('Ce navigateur ne permet pas la dictée vocale.');
  signal.throwIfAborted();
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
  } catch {
    throw new Error('Micro inaccessible : autorisez-le dans le navigateur.');
  }
  if (signal.aborted) {
    for (const track of stream.getTracks()) track.stop();
    return null;
  }

  let context: AudioContext | undefined;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    for (const track of stream.getTracks()) track.stop();
    if (context && context.state !== 'closed') void context.close();
  };
  signal.addEventListener('abort', release, { once: true });
  try {
    const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/mp4'].find(
      (mime) => MediaRecorder.isTypeSupported(mime),
    );
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    context = new AudioContext();
    await context.resume();
    if (signal.aborted) return null;
    const analyser = context.createAnalyser();
    context.createMediaStreamSource(stream).connect(analyser);
    const samples = new Float32Array(analyser.fftSize);

    return await new Promise<Blob | null>((resolve, reject) => {
      const chunks: Blob[] = [];
      const startedAt = Date.now();
      let spokeAt = 0;
      let timer: ReturnType<typeof setInterval> | undefined;
      let finished = false;
      const stop = () => {
        if (recorder.state !== 'inactive') recorder.stop();
      };
      const finish = (error?: Error) => {
        if (finished) return;
        finished = true;
        clearInterval(timer);
        signal.removeEventListener('abort', abort);
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.onerror = null;
        stop();
        release();
        if (error) reject(error);
        else
          resolve(
            !signal.aborted && spokeAt > 0 ? new Blob(chunks, { type: recorder.mimeType }) : null,
          );
      };
      const abort = () => finish();
      signal.addEventListener('abort', abort, { once: true });
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => finish();
      recorder.onerror = () => finish(new Error('L’enregistrement du micro a échoué.'));
      try {
        recorder.start(250);
      } catch {
        finish(new Error('L’enregistrement du micro n’a pas pu démarrer.'));
        return;
      }
      timer = setInterval(() => {
        analyser.getFloatTimeDomainData(samples);
        const level = Math.sqrt(
          samples.reduce((sum, value) => sum + value * value, 0) / samples.length,
        );
        const now = Date.now();
        if (level > 0.04) spokeAt = now;
        if (
          (spokeAt > 0 && now - spokeAt > 1_200) ||
          (spokeAt === 0 && now - startedAt > 8_000) ||
          now - startedAt > 60_000
        )
          stop();
      }, 50);
      onReady?.(stop);
      if (signal.aborted) abort();
    });
  } finally {
    signal.removeEventListener('abort', release);
    release();
  }
}
