// Listes de valeurs du domaine et leurs libellés. Une valeur (code, en anglais) n'est jamais
// écrite en dur ailleurs : on importe la liste d'ici.

export const PROFILE_ROLES = ['admin', 'member'] as const;
export type ProfileRole = (typeof PROFILE_ROLES)[number];

export const PROFILE_ROLE_LABELS = {
  admin: 'Vérificateur',
  member: 'Citoyen',
} satisfies Record<ProfileRole, string>;

// Ton d'un badge ou d'un encadré : il choisit la couleur d'état (voir ToneBadge).
export const TONES = ['success', 'info', 'warning', 'danger', 'neutral'] as const;
export type Tone = (typeof TONES)[number];

// Niveau de certitude d'une conclusion du tribunal. « insufficient » est une conclusion normale.
export const CERTAINTY_LEVELS = [
  'established',
  'probable',
  'uncertain',
  'contradicted',
  'insufficient',
] as const;
export type CertaintyLevel = (typeof CERTAINTY_LEVELS)[number];

export const CERTAINTY_LABELS = {
  established: 'Établi',
  probable: 'Probable',
  uncertain: 'Incertain',
  contradicted: 'Contredit',
  insufficient: 'Informations insuffisantes',
} satisfies Record<CertaintyLevel, string>;

export const CERTAINTY_CRITERIA = {
  established: 'Au moins deux pièces indépendantes concordent, aucune ne contredit.',
  probable: 'Une pièce solide, rien ne contredit.',
  uncertain: 'Des pièces solides se contredisent.',
  contradicted: 'Au moins une pièce solide contredit l’information.',
  insufficient: 'Aucune pièce solide.',
} satisfies Record<CertaintyLevel, string>;

export const CERTAINTY_TONES = {
  established: 'success',
  probable: 'info',
  uncertain: 'warning',
  contradicted: 'danger',
  insufficient: 'neutral',
} satisfies Record<CertaintyLevel, Tone>;

// Une affaire : une information suspecte et tout ce qu'on a trouvé sur elle.
export const CASE_KINDS = ['real', 'fictional'] as const;
export type CaseKind = (typeof CASE_KINDS)[number];

export const CASE_KIND_LABELS = {
  real: 'Réelle',
  fictional: 'Fictive (exercice)',
} satisfies Record<CaseKind, string>;

export const CASE_STATUSES = ['open', 'investigating', 'in_hearing', 'concluded'] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export const CASE_STATUS_LABELS = {
  open: 'Ouverte',
  investigating: 'En enquête',
  in_hearing: 'En audience',
  concluded: 'Conclue',
} satisfies Record<CaseStatus, string>;

export const CASE_STATUS_TONES = {
  open: 'neutral',
  investigating: 'info',
  in_hearing: 'warning',
  concluded: 'success',
} satisfies Record<CaseStatus, Tone>;

// Ce qui a changé entre deux versions d'une même information.
export const CHANGE_TYPES = [
  'shared_unchanged',
  'title_changed',
  'figure_changed',
  'image_added',
  'passage_cut',
  'translated',
  'tone_hardened',
] as const;
export type ChangeType = (typeof CHANGE_TYPES)[number];

export const CHANGE_TYPE_LABELS = {
  shared_unchanged: 'Repris sans changement',
  title_changed: 'Titre changé',
  figure_changed: 'Chiffre ou date modifié',
  image_added: 'Image ajoutée hors sujet',
  passage_cut: 'Passage coupé',
  translated: 'Traduit',
  tone_hardened: 'Ton durci',
} satisfies Record<ChangeType, string>;

// Confiance dans un lien du graphe : « cette version reprend bien celle-là ».
export const LINK_CONFIDENCES = ['high', 'medium', 'low'] as const;
export type LinkConfidence = (typeof LINK_CONFIDENCES)[number];

export const LINK_CONFIDENCE_LABELS = {
  high: 'Forte',
  medium: 'Moyenne',
  low: 'Faible',
} satisfies Record<LinkConfidence, string>;

// Une pièce du dossier : ce qu'elle dit de l'information, et sa solidité.
export const EVIDENCE_STANCES = ['supports', 'contradicts', 'context'] as const;
export type EvidenceStance = (typeof EVIDENCE_STANCES)[number];

export const EVIDENCE_STANCE_LABELS = {
  supports: 'Confirme',
  contradicts: 'Contredit',
  context: 'Contexte',
} satisfies Record<EvidenceStance, string>;

export const EVIDENCE_STANCE_TONES = {
  supports: 'success',
  contradicts: 'danger',
  context: 'neutral',
} satisfies Record<EvidenceStance, Tone>;

export const EVIDENCE_STRENGTHS = ['solid', 'weak'] as const;
export type EvidenceStrength = (typeof EVIDENCE_STRENGTHS)[number];

export const EVIDENCE_STRENGTH_LABELS = {
  solid: 'Solide',
  weak: 'Fragile',
} satisfies Record<EvidenceStrength, string>;

// D'où vient une réponse d'IA affichée à l'écran (voir AiSourceBadge).
export const AI_SOURCES = ['gemini', 'fallback'] as const;
export type AiSource = (typeof AI_SOURCES)[number];

export const AI_SOURCE_LABELS = {
  gemini: 'Réponse de l’IA',
  fallback: 'Réponse préparée (hors ligne)',
} satisfies Record<AiSource, string>;
