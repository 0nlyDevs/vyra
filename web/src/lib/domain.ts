// Listes de valeurs du domaine et leurs libellés. Une valeur (code, en anglais) n'est jamais
// écrite en dur ailleurs : on importe la liste d'ici.

export const PROFILE_ROLES = ['admin', 'member'] as const;
export type ProfileRole = (typeof PROFILE_ROLES)[number];

export const PROFILE_ROLE_LABELS = {
  admin: 'Vérificateur',
  member: 'Citoyen',
} satisfies Record<ProfileRole, string>;

// Le vérificateur voit les groupes d'alertes et peut ouvrir une affaire sans attendre le seuil.
export function isVerifier(role: ProfileRole) {
  return role === 'admin';
}

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

// Ce qu'une source dit par rapport à l'information analysée (le lien qui la relie au centre de la
// toile) : ce qui a changé, ou bien un démenti, ou le même sujet sans le même fait.
export const CHANGE_TYPES = [
  'shared_unchanged',
  'title_changed',
  'figure_changed',
  'image_added',
  'passage_cut',
  'translated',
  'tone_hardened',
  'contradicts',
  'related',
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
  contradicts: 'Dément l’information',
  related: 'Même sujet, autre fait',
} satisfies Record<ChangeType, string>;

// Couleur d'un lien du graphe : plus le changement déforme l'information, plus il est appuyé.
export const CHANGE_TYPE_TONES = {
  shared_unchanged: 'neutral',
  title_changed: 'info',
  figure_changed: 'danger',
  image_added: 'warning',
  passage_cut: 'warning',
  translated: 'info',
  tone_hardened: 'danger',
  contradicts: 'success',
  related: 'neutral',
} satisfies Record<ChangeType, Tone>;

// Type de source d'une version du graphe ou d'une pièce, déduit de son adresse ou de son nom.
export const SOURCE_KINDS = [
  'fact_checker',
  'press',
  'official',
  'media',
  'website',
  'blog',
  'forum',
  'social',
  'messaging',
  'unknown',
] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];

export const SOURCE_KIND_LABELS = {
  fact_checker: 'Vérificateur de faits',
  press: 'Presse reconnue',
  official: 'Source officielle',
  media: 'Média',
  website: 'Site web',
  blog: 'Blog',
  forum: 'Forum',
  social: 'Réseau social',
  messaging: 'Messagerie',
  unknown: 'Source inconnue',
} satisfies Record<SourceKind, string>;

export const SOURCE_KIND_TONES = {
  fact_checker: 'success',
  press: 'success',
  official: 'success',
  media: 'info',
  website: 'neutral',
  blog: 'neutral',
  forum: 'warning',
  social: 'warning',
  messaging: 'danger',
  unknown: 'neutral',
} satisfies Record<SourceKind, Tone>;

// Ce qu'un texte dit par rapport à une information, selon l'IA (module Enquête) : seul « same »
// en fait une version du graphe.
export const INFO_RELATIONS = ['same', 'contradicts', 'related', 'unrelated'] as const;
export type InfoRelation = (typeof INFO_RELATIONS)[number];

// Comment une nouvelle analyse a retrouvé une affaire existante (module Enquête).
export const MATCH_KINDS = ['ai', 'meaning', 'words'] as const;
export type MatchKind = (typeof MATCH_KINDS)[number];

export const MATCH_KIND_LABELS = {
  ai: 'Même fait, confirmé par l’IA',
  meaning: 'Proche par le sens (l’IA n’a pas pu confirmer)',
  words: 'Mêmes mots (IA indisponible)',
} satisfies Record<MatchKind, string>;

// Recherche web d'une affaire (module Enquête) : faite une fois, son résultat est gardé.
export const WEB_SEARCH_STATUSES = ['found', 'nothing_found'] as const;
export type WebSearchStatus = (typeof WEB_SEARCH_STATUSES)[number];

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

// ─── Boîte d'alertes ────────────────────────────────────────────────────────────────────────

// Pourquoi une personne signale un contenu.
export const REPORT_REASONS = [
  'fake',
  'misleading',
  'out_of_context',
  'generated_media',
  'scam',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_REASON_LABELS = {
  fake: 'Faux',
  misleading: 'Trompeur',
  out_of_context: 'Sorti de son contexte',
  generated_media: 'Image ou voix générée',
  scam: 'Arnaque',
} satisfies Record<ReportReason, string>;

// Où en est un signalement (et son groupe). Cet état n'est pas enregistré : il se déduit du nombre
// de signaleurs du groupe et de l'affaire ouverte pour lui (voir server/dal/reports.ts).
export const REPORT_STATES = ['received', 'grouped', 'verifying', 'concluded'] as const;
export type ReportState = (typeof REPORT_STATES)[number];

export const REPORT_STATE_LABELS = {
  received: 'Reçu',
  grouped: 'Regroupé',
  verifying: 'En vérification',
  concluded: 'Conclu',
} satisfies Record<ReportState, string>;

export const REPORT_STATE_TONES = {
  received: 'neutral',
  grouped: 'info',
  verifying: 'warning',
  concluded: 'success',
} satisfies Record<ReportState, Tone>;

// À ce nombre de signaleurs différents, une affaire est ouverte pour le groupe.
export const REPORT_CASE_THRESHOLD = 5;
// Signalements sans compte comptés au plus pour un groupe : il faut toujours des membres pour
// atteindre le seuil.
export const REPORT_ANONYMOUS_CAP = 2;
// Signalements permis par personne sur 24 heures.
export const REPORT_DAILY_LIMIT = 10;

// ─── Tribunal ───────────────────────────────────────────────────────────────────────────────

// Le vote du juré, enregistré avant la conclusion du juge.
export const VOTES = ['accurate', 'misleading', 'unsure'] as const;
export type Vote = (typeof VOTES)[number];

export const VOTE_LABELS = {
  accurate: 'Exacte',
  misleading: 'Trompeuse',
  unsure: 'Je ne sais pas',
} satisfies Record<Vote, string>;

// Le vote qui rejoint chaque niveau de certitude : sert à comparer le vote et la conclusion.
export const VOTE_MATCHING_CERTAINTY = {
  established: 'accurate',
  probable: 'accurate',
  uncertain: 'unsure',
  contradicted: 'misleading',
  insufficient: 'unsure',
} satisfies Record<CertaintyLevel, Vote>;

export const HEARING_STATUSES = ['pleaded', 'concluded'] as const;
export type HearingStatus = (typeof HEARING_STATUSES)[number];

// ─── Scan d'image et de vocal ───────────────────────────────────────────────────────────────

export const MEDIA_KINDS = ['image', 'audio'] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

// Résultat global d'un scan d'image : jamais « c'est une IA », seulement ce qu'on a relevé.
export const SCAN_OUTCOMES = ['ai_signature', 'clues', 'no_clue'] as const;
export type ScanOutcome = (typeof SCAN_OUTCOMES)[number];

export const SCAN_OUTCOME_LABELS = {
  ai_signature: 'Signature IA trouvée',
  clues: 'Des indices, sans certitude',
  no_clue: 'Aucun indice, ce qui ne prouve rien',
} satisfies Record<ScanOutcome, string>;

export const SCAN_OUTCOME_DESCRIPTIONS = {
  ai_signature: 'Le fichier déclare lui-même avoir été produit par un outil d’IA.',
  clues: 'Des éléments méritent une vérification. Aucun ne suffit à conclure seul.',
  no_clue:
    'Rien de suspect n’a été relevé. Une image peut pourtant être authentique et sortie de son contexte.',
} satisfies Record<ScanOutcome, string>;

export const SCAN_OUTCOME_TONES = {
  ai_signature: 'danger',
  clues: 'warning',
  no_clue: 'neutral',
} satisfies Record<ScanOutcome, Tone>;

// ─── Signes d'alerte (comment un message est écrit, lu sans IA) ─────────────────────────────

export const TONE_LEVELS = ['sensational', 'marked', 'neutral'] as const;
export type ToneLevel = (typeof TONE_LEVELS)[number];

export const TONE_LEVEL_LABELS = {
  sensational: 'Ton sensationnel',
  marked: 'Ton appuyé',
  neutral: 'Ton neutre',
} satisfies Record<ToneLevel, string>;

export const TONE_LEVEL_TONES = {
  sensational: 'danger',
  marked: 'warning',
  neutral: 'neutral',
} satisfies Record<ToneLevel, Tone>;

export const TONE_SIGN_KINDS = [
  'urgency',
  'share',
  'emotive',
  'hidden',
  'caps',
  'exclamations',
  'emoji',
] as const;
export type ToneSignKind = (typeof TONE_SIGN_KINDS)[number];

export const TONE_SIGN_LABELS = {
  urgency: 'Urgence',
  share: 'Appel à partager',
  emotive: 'Mot chargé d’émotion',
  hidden: '« On vous cache la vérité »',
  caps: 'Écrit en capitales',
  exclamations: 'Points d’exclamation empilés',
  emoji: 'Émoji d’alarme',
} satisfies Record<ToneSignKind, string>;

export const DANGER_LEVELS = ['high', 'medium', 'low'] as const;
export type DangerLevel = (typeof DANGER_LEVELS)[number];

export const DANGER_LEVEL_LABELS = {
  high: 'Danger élevé si elle circule',
  medium: 'Danger possible si elle circule',
  low: 'Peu de danger apparent',
} satisfies Record<DangerLevel, string>;

export const DANGER_LEVEL_TONES = {
  high: 'danger',
  medium: 'warning',
  low: 'neutral',
} satisfies Record<DangerLevel, Tone>;

export const DANGER_SIGN_KINDS = ['violence', 'accusation', 'panic', 'fake_order'] as const;
export type DangerSignKind = (typeof DANGER_SIGN_KINDS)[number];

export const DANGER_SIGN_LABELS = {
  violence: 'Appel à la violence',
  accusation: 'Accusation contre une personne',
  panic: 'Peut créer la panique',
  fake_order: 'Se présente comme un texte officiel',
} satisfies Record<DangerSignKind, string>;

// ─── Comptes ────────────────────────────────────────────────────────────────────────────────

// Lien à usage unique envoyé par e-mail.
export const AUTH_TOKEN_PURPOSES = ['verify_email', 'reset_password'] as const;
export type AuthTokenPurpose = (typeof AUTH_TOKEN_PURPOSES)[number];

// ─── Jeu vrai ou fake ───────────────────────────────────────────────────────────────────────

// La réponse du joueur, et la bonne réponse d'une information du jeu.
export const GAME_ANSWERS = ['true', 'fake', 'cannot_tell'] as const;
export type GameAnswer = (typeof GAME_ANSWERS)[number];

export const GAME_ANSWER_LABELS = {
  true: 'Vrai',
  fake: 'Fake',
  cannot_tell: 'Impossible à dire',
} satisfies Record<GameAnswer, string>;

export const GAME_ANSWER_TONES = {
  true: 'success',
  fake: 'danger',
  cannot_tell: 'neutral',
} satisfies Record<GameAnswer, Tone>;

// Les indices qu'on retourne pour juger une information.
export const CLUE_KINDS = ['source', 'date', 'image', 'author', 'other_media'] as const;
export type ClueKind = (typeof CLUE_KINDS)[number];

export const CLUE_KIND_LABELS = {
  source: 'La source',
  date: 'La date',
  image: 'L’image',
  author: 'L’auteur',
  other_media: 'Les autres médias',
} satisfies Record<ClueKind, string>;

// La note que le joueur donne à un indice.
export const CLUE_RATINGS = ['reliable', 'suspicious'] as const;
export type ClueRating = (typeof CLUE_RATINGS)[number];

export const CLUE_RATING_LABELS = {
  reliable: 'Fiable',
  suspicious: 'Suspect',
} satisfies Record<ClueRating, string>;

// Le grade d'une série, d'après la part de bonnes réponses.
export const GAME_GRADES = ['beginner', 'vigilant', 'expert'] as const;
export type GameGrade = (typeof GAME_GRADES)[number];

export const GAME_GRADE_LABELS = {
  beginner: 'Débutant',
  vigilant: 'Vigilant',
  expert: 'Expert',
} satisfies Record<GameGrade, string>;

export const GAME_GRADE_TONES = {
  beginner: 'neutral',
  vigilant: 'info',
  expert: 'success',
} satisfies Record<GameGrade, Tone>;

// Sur une série de 5 : 0 à 2 bonnes réponses = débutant, 3 ou 4 = vigilant, 5 = expert.
export function gameGradeOf(score: number, total: number): GameGrade {
  if (total > 0 && score >= total) return 'expert';
  return total > 0 && score / total >= 0.6 ? 'vigilant' : 'beginner';
}

// ─── Fil d'actualité ────────────────────────────────────────────────────────────────────────

// État d'une publication du fil, calculé depuis son affaire et ses signalements.
export const FEED_STATUSES = ['unverified', 'reported', 'verifying', 'concluded'] as const;
export type FeedStatus = (typeof FEED_STATUSES)[number];

export const FEED_STATUS_LABELS = {
  unverified: 'Non vérifié',
  reported: 'Signalé',
  verifying: 'En vérification',
  concluded: 'Conclu',
} satisfies Record<FeedStatus, string>;

export const FEED_STATUS_TONES = {
  unverified: 'neutral',
  reported: 'warning',
  verifying: 'info',
  concluded: 'success',
} satisfies Record<FeedStatus, Tone>;

// Région choisie à l'entrée du fil : ses sources passent en premier, le monde vient à côté.
export const FEED_REGIONS = ['mg', 'world'] as const;
export type FeedRegion = (typeof FEED_REGIONS)[number];

export const FEED_REGION_LABELS = {
  mg: 'Madagascar',
  world: 'Monde',
} satisfies Record<FeedRegion, string>;

// D'où vient une publication du fil. Toutes sont réelles, officielles ou non.
export const FEED_KINDS = ['press', 'tv', 'facebook', 'social', 'trend', 'factcheck'] as const;
export type FeedKind = (typeof FEED_KINDS)[number];

export const FEED_KIND_LABELS = {
  press: 'Presse',
  tv: 'Télévision',
  facebook: 'Facebook',
  social: 'Réseau social',
  trend: 'Tendance',
  factcheck: 'Vérification',
} satisfies Record<FeedKind, string>;

export const FEED_KIND_TONES = {
  press: 'neutral',
  tv: 'neutral',
  facebook: 'warning',
  social: 'warning',
  trend: 'info',
  factcheck: 'success',
} satisfies Record<FeedKind, Tone>;

// Ce que mesure la portée d'une publication, selon sa source.
export const FEED_REACH_UNITS = {
  press: null,
  tv: 'vues',
  // Vidéos seulement : Facebook ne donne pas la portée d'un post écrit.
  facebook: 'vues',
  social: 'partages',
  trend: 'recherches',
  factcheck: null,
} satisfies Record<FeedKind, string | null>;

// Les publications non officielles : réseaux sociaux et Facebook.
export const UNOFFICIAL_FEED_KINDS: readonly FeedKind[] = ['facebook', 'social'];

// Les vues du fil (paramètre `vue` de l'adresse). `local` : la région choisie.
export const FEED_VIEWS = ['all', 'local', 'world', 'unofficial', 'checked'] as const;
export type FeedView = (typeof FEED_VIEWS)[number];

export const FEED_VIEW_LABELS = {
  all: 'Tout',
  local: 'Madagascar',
  world: 'Monde',
  unofficial: 'Réseaux sociaux',
  checked: 'Analysées',
} satisfies Record<FeedView, string>;
