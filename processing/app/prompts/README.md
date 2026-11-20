# Prompts

Un prompt = un fichier `<nom>.md` ici, plus sa réponse de secours `../fallbacks/<nom>.json`.

- Le nom : lettres minuscules, chiffres et tirets (`summarize`, `classify-ticket`).
- La consigne décrit le JSON reçu (`payload`) et le JSON attendu en réponse.
- La réponse de secours a exactement la même forme : c'est elle qui s'affiche si le wifi tombe
  ou si `DEMO_OFFLINE=true`. Elle doit être crédible pour la démo.

Côté web, on l'appelle avec `runPrompt('<nom>', payload, schémaZod)` (`src/server/processing.ts`).
