// Vérification rapide d'un texte ou d'un lien, sans compte : même réponse que `/api/check`
// (utilisée par l'extension du navigateur). L'application mobile l'appelle ici, sous `/api/v1`.
export { POST } from '../../check/route';
