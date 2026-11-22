# Prompts

Un prompt = un fichier `<nom>.md` ici, plus sa réponse de secours `../fallbacks/<nom>.json`.

- Le nom : lettres minuscules, chiffres et tirets (`what-if`, `same-information`).
- La consigne décrit le JSON reçu (`payload`) et le JSON attendu en réponse.
- La réponse de secours respecte le même contrat JSON : elle est utilisée si le service reste joignable mais qu’aucun modèle ne répond
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

## Contrôle des réponses et provenance

La consigne commune `_guardrails.md` est ajoutée à chaque prompt. Le JSON est validé côté web
par le schéma Zod ; les sources et les actions de l’assistant sont ensuite filtrées côté serveur.
Le niveau de certitude du tribunal est calculé par `features/court/certainty.ts`, pas choisi par
le prompt `judge`. La signature d’une carte relève du serveur web (Ed25519), pas d’un modèle.

`source: "gemini"` est un libellé historique : il indique qu’un modèle a répondu (Groq, Gemini,
DeepSeek ou modèle local), pas que la clé Gemini fonctionne. `fallback` désigne une réponse sans
modèle. Les journaux du service distinguent les fournisseurs, sans recopier leurs clés.

Pour l’assistant, `external` contient les articles réellement reçus (web, Wikipédia, vérificateurs),
leurs extraits et dates ; `search` indique les recherches disponibles. Les citations `[S1]` et les
liens affichés doivent correspondre à ces résultats. Sans synthèse IA, le web peut encore afficher
les sources trouvées. Le mode de lecture « Sans IA » masque des blocs ; `DEMO_OFFLINE` désactive les
appels aux modèles et aux moteurs de recherche. Aucun de ces mécanismes ne rend un serveur distant
accessible sans internet.
