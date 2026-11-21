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
  FORBIDDEN: {
    code: 'FORBIDDEN',
    message: 'Cette action est réservée aux vérificateurs.',
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
  ALREADY_REPORTED: {
    code: 'ALREADY_REPORTED',
    message: 'Vous avez déjà signalé ce contenu. Merci : il est suivi dans « Mes signalements ».',
  },
  REPORT_LIMIT_REACHED: {
    code: 'REPORT_LIMIT_REACHED',
    message: 'Vous avez atteint la limite de signalements pour aujourd’hui. Réessayez demain.',
  },
  FILE_TOO_LARGE: {
    code: 'FILE_TOO_LARGE',
    message: 'Le fichier est trop lourd : 8 Mo au maximum.',
  },
  FILE_NOT_SUPPORTED: {
    code: 'FILE_NOT_SUPPORTED',
    message: 'Ce type de fichier n’est pas pris en charge.',
  },
  NOTHING_TO_ADD: {
    code: 'NOTHING_TO_ADD',
    message: 'Ce scan n’a relevé aucun indice à verser au dossier.',
  },
  EMAIL_TAKEN: {
    code: 'EMAIL_TAKEN',
    message: 'Un compte existe déjà avec cette adresse. Connectez-vous.',
  },
  INVALID_CREDENTIALS: {
    code: 'INVALID_CREDENTIALS',
    message: 'E-mail ou mot de passe incorrect.',
  },
  GOOGLE_ONLY_ACCOUNT: {
    code: 'GOOGLE_ONLY_ACCOUNT',
    message: 'Ce compte se connecte avec Google. Utilisez « Continuer avec Google ».',
  },
  LINK_INVALID: {
    code: 'LINK_INVALID',
    message: 'Ce lien n’est plus valable. Demandez-en un nouveau.',
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
