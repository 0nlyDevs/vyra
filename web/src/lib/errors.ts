// Catalogue unique des erreurs renvoyées au client. On compare toujours par code
// (`error.code === ERRORS.NOT_FOUND.code`), jamais par le texte du message.
// Une fonctionnalité ajoute ses propres codes ici.

// Garantit que chaque clé est identique à son `code` tout en gardant les types littéraux.
function defineErrors<const T extends { [K in keyof T]: { code: K; message: string } }>(errors: T) {
  return errors;
}

export const ERRORS = defineErrors({
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    message: 'Choisissez un profil pour continuer.',
  },
  NOT_FOUND: {
    code: 'NOT_FOUND',
    message: "L'élément demandé est introuvable.",
  },
  VALIDATION_FAILED: {
    code: 'VALIDATION_FAILED',
    message: 'Certaines informations sont invalides. Vérifiez le formulaire.',
  },
  AI_UNAVAILABLE: {
    code: 'AI_UNAVAILABLE',
    message: "L'IA est momentanément indisponible. Réessayez dans un instant.",
  },
  WEB_SEARCH_UNAVAILABLE: {
    code: 'WEB_SEARCH_UNAVAILABLE',
    message: "La recherche sur le web n'a pas pu se faire. Réessayez dans un instant.",
  },
  INTERNAL: {
    code: 'INTERNAL',
    message: 'Une erreur inattendue est survenue. Réessayez.',
  },
});

export type ErrorCode = keyof typeof ERRORS;

export type AppError = {
  code: ErrorCode;
  message: string;
  // Messages de validation par champ (VALIDATION_FAILED), affichables sous chaque champ.
  fieldErrors?: Record<string, string[] | undefined>;
};
