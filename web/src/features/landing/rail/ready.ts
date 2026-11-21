import { useSyncExternalStore } from 'react';

// « La page est prête » : le préchargeur est parti. Le hero attend ce signal pour lancer son intro.
let ready = false;
const listeners = new Set<() => void>();

export function setLandingReady(value: boolean) {
  if (ready === value) return;
  ready = value;
  for (const listener of listeners) listener();
}

export function useLandingReady() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => ready,
    () => false,
  );
}
