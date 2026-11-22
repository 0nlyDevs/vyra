// Contrôle de ce que dit l'assistant avant que la personne le lise : l'IA peut mal faire, on ne lui
// fait pas confiance. Trois règles, appliquées après le modèle :
// 1. aucun lien dans le texte (un lien inventé serait un faux) : les sources sont les citations ;
// 2. une réponse qui tranche (« c'est vrai / faux ») sans citer une affaire jugée est remplacée :
//    seul le tribunal conclut ;
// 3. une longueur bornée.

const MAX_ANSWER_CHARS = 1_200;
export const NO_VERDICT_ANSWER =
  'Je ne peux pas trancher : aucune affaire jugée ne me permet de répondre à cela. Ouvrez une enquête pour en retracer l’histoire, ou signalez le contenu pour qu’il soit examiné.';

const URL_PATTERN = /\b(?:https?:\/\/|www\.)\S+/gi;
const VERDICT_PATTERN =
  /\b(?:c['’]est|cela est|ceci est|l['’]information est|cette information est|il est)\s+(?:tout à fait\s+|bien\s+|totalement\s+|entièrement\s+|complètement\s+)?(?:vrai|vraie|faux|fausse|un fake|un faux)\b/i;

export function guardAnswer(
  answer: string,
  citationCount: number,
): { answer: string; guarded: boolean } {
  let text = answer.replace(URL_PATTERN, '[lien retiré]').trim();
  if (citationCount === 0 && VERDICT_PATTERN.test(text)) {
    return { answer: NO_VERDICT_ANSWER, guarded: true };
  }
  if (text.length > MAX_ANSWER_CHARS) {
    const cut = text.slice(0, MAX_ANSWER_CHARS);
    const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
    text = `${end > 200 ? cut.slice(0, end + 1) : cut}…`;
  }
  return { answer: text, guarded: text !== answer.trim() };
}
