import { ZxcvbnFactory } from '@zxcvbn-ts/core';
import * as common from '@zxcvbn-ts/language-common';
import * as fr from '@zxcvbn-ts/language-fr';

// Solidité d'un nouveau mot de passe, estimée comme le ferait un logiciel qui devine les mots de
// passe (zxcvbn) : mots de passe courants, mots du dictionnaire, suites de touches (« dertgfds »,
// « azertyuiop »), répétitions, dates, l33t, et le nom ou l'e-mail de la personne. Une liste fixe
// ne suffit pas : elle ne voit pas les motifs. Seulement côté serveur (dictionnaires de plusieurs Mo).

// Note de 0 à 4. 3 = « bien protégé contre une attaque lente sur une empreinte volée » : un mot de
// passe de 8 caractères doit alors être vraiment aléatoire, une phrase de plusieurs mots passe.
export const MIN_SCORE = 3;

// Les mots qu'on devinerait ici en premier.
const SITE_WORDS = ['vyra', 'madagascar', 'antananarivo', 'tananarive', 'malagasy', 'motdepasse'];

let estimator: ZxcvbnFactory | null = null;

// Chargé au premier besoin : la connexion, qui n'en a pas besoin, ne paie pas les dictionnaires.
function getEstimator() {
  estimator ??= new ZxcvbnFactory({
    dictionary: { ...common.dictionary, ...fr.dictionary, userInputs: SITE_WORDS },
    graphs: common.adjacencyGraphs,
    translations: fr.translations,
  });
  return estimator;
}

// null si le mot de passe est assez solide ; sinon, pourquoi, en français, pour le formulaire.
export async function passwordWeakness(password: string, personal: string[] = []) {
  const result = await getEstimator().check(password, personal.filter(Boolean));
  if (result.score >= MIN_SCORE) return null;
  const warning = result.feedback.warning?.trim();
  const reason = warning
    ? warning.replace(/[.!]?$/, '.')
    : 'Ce mot de passe est trop facile à deviner.';
  return `${reason} Essayez une phrase de plusieurs mots.`;
}
