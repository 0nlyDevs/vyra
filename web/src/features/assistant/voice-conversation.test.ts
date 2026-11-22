import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { runVoiceConversation, type VoicePhase } from './voice-conversation';

describe('conversation vocale', () => {
  it('enchaîne écoute, transcription, réponse et lecture, puis écoute à nouveau', async () => {
    const controller = new AbortController();
    const events: string[] = [];
    let recordings = 0;
    await runVoiceConversation(
      {
        record: async () => {
          events.push('micro');
          if (++recordings === 2) controller.abort();
          return new Blob(['voix']);
        },
        transcribe: async () => {
          events.push('transcrire');
          return 'Bonjour';
        },
        answer: async (question) => {
          events.push(question);
          return 'Bienvenue';
        },
        speak: async (answer) => {
          events.push(answer);
        },
        onPhase: (phase) => events.push(phase),
      },
      controller.signal,
    );
    assert.deepEqual(events, [
      'listening',
      'micro',
      'transcribing',
      'transcrire',
      'thinking',
      'Bonjour',
      'speaking',
      'Bienvenue',
      'listening',
      'micro',
    ]);
  });

  it('continue à écouter après un silence sans envoyer de question vide', async () => {
    const controller = new AbortController();
    let recordings = 0;
    await runVoiceConversation(
      {
        record: async () => {
          if (++recordings === 2) controller.abort();
          return null;
        },
        transcribe: async () => assert.fail('Aucun enregistrement à transcrire'),
        answer: async () => assert.fail('Aucune question à envoyer'),
        speak: async () => assert.fail('Aucune réponse à lire'),
        onPhase: () => undefined,
      },
      controller.signal,
    );
    assert.equal(recordings, 2);
  });

  for (const cancelledAt of [
    'listening',
    'transcribing',
    'thinking',
    'speaking',
  ] satisfies VoicePhase[]) {
    it(`ne relance aucune étape après une désactivation pendant ${cancelledAt}`, async () => {
      const controller = new AbortController();
      const phases: VoicePhase[] = [];
      const finish = <T>(phase: VoicePhase, value: T) => {
        if (phase === cancelledAt) controller.abort();
        return Promise.resolve(value);
      };
      await runVoiceConversation(
        {
          record: () => finish('listening', new Blob(['voix'])),
          transcribe: () => finish('transcribing', 'Ouvre les enquêtes'),
          answer: () => finish('thinking', 'Je vous y emmène.'),
          speak: () => finish('speaking', undefined),
          onPhase: (phase) => phases.push(phase),
        },
        controller.signal,
      );
      const order: VoicePhase[] = ['listening', 'transcribing', 'thinking', 'speaking'];
      assert.deepEqual(phases, order.slice(0, order.indexOf(cancelledAt) + 1));
    });
  }

  it('n’envoie rien si la session est déjà arrêtée', async () => {
    const controller = new AbortController();
    controller.abort();
    await runVoiceConversation(
      {
        record: async () => assert.fail('Micro éteint'),
        transcribe: async () => assert.fail('Aucune transcription'),
        answer: async () => assert.fail('Aucune question'),
        speak: async () => assert.fail('Aucune lecture'),
        onPhase: () => assert.fail('Aucune étape'),
      },
      controller.signal,
    );
  });
});
