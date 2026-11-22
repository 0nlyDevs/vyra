import assert from 'node:assert/strict';
import { it } from 'node:test';
import { recordSpeech } from './recording';

it('rend le micro si son autorisation arrive après la désactivation du mode voix', async () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const permission = Promise.withResolvers<MediaStream>();
  let stopped = 0;
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { MediaRecorder: true, AudioContext: true },
  });
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { mediaDevices: { getUserMedia: () => permission.promise } },
  });
  try {
    const controller = new AbortController();
    const recording = recordSpeech(controller.signal);
    controller.abort();
    permission.resolve({
      getTracks: () => [
        {
          stop: () => {
            stopped += 1;
          },
        },
      ],
    } as unknown as MediaStream);
    assert.equal(await recording, null);
    assert.equal(stopped, 1);
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
    else Reflect.deleteProperty(globalThis, 'navigator');
  }
});
