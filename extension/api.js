// Les appels à la plateforme : une adresse réglable, un délai, et des erreurs lisibles.

import { CHECK_TIMEOUT_MS, DEFAULT_BASE_URL } from './config.js';

export async function baseUrl() {
  const { baseUrl: stored } = await chrome.storage.local.get('baseUrl');
  return (stored || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

/**
 * Appelle la plateforme. Renvoie `{ data, base }`, ou `{ error }` avec un message qu'on peut montrer :
 * une panne de l'hébergeur renvoie une page et non du JSON, on ne la prend pas pour un réseau coupé.
 */
export async function callPlatform(path, init) {
  const base = await baseUrl();
  try {
    const response = await fetch(`${base}${path}`, { ...init, signal: AbortSignal.timeout(CHECK_TIMEOUT_MS) });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data) {
      return { error: data?.error || `La plateforme a répondu une erreur (${response.status}). Réessayez dans un instant.` };
    }
    return { data, base };
  } catch (error) {
    return {
      error:
        error?.name === 'TimeoutError'
          ? 'La plateforme met trop de temps à répondre. Réessayez dans un instant.'
          : `Plateforme injoignable à ${base}. Vérifiez votre connexion, ou changez son adresse dans Réglages.`,
    };
  }
}
