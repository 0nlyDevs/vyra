# Prompts

Un prompt = un fichier `<nom>.md` ici, plus sa réponse de secours `../fallbacks/<nom>.json`.

- Le nom : lettres minuscules, chiffres et tirets (`what-if`, `same-information`).
- La consigne décrit le JSON reçu (`payload`) et le JSON attendu en réponse.
- La réponse de secours a exactement la même forme : c'est elle qui s'affiche si le wifi tombe
  ou si `DEMO_OFFLINE=true`. Elle doit être crédible pour la démo.

Côté web, on l'appelle avec `runPrompt('<nom>', payload, schémaZod)` (`src/server/processing.ts`).

## Réponse de secours propre à un cas de démo

Facultatif : `../fallbacks/<nom>--<variante>.json` (par exemple `judge--flood.json`). Le web la
demande avec `runPrompt('<nom>', payload, schéma, { fallbackVariant: '<variante>' })`. Sans IA,
c'est elle qui s'affiche ; sans fichier pour cette variante, la réponse de secours générale
s'applique. Ainsi, une affaire de démo reste cohérente même sans IA.

## Image ou son joint

`runPrompt('<nom>', payload, schéma, { files: [{ mimeType, data }] })`, `data` en base64. Le
modèle (Gemini ou Gemma 4 en local) lit le fichier avec la consigne.
