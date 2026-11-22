import 'server-only';
import { z } from 'zod';

// Seul fichier autorisé à lire `process.env` (règle Biome `noProcessEnv`).
// Une variable absente ou invalide arrête l'application avec un message qui la nomme.
// Toute nouvelle variable s'ajoute ici et dans `web/.env.example`.

const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().startsWith('postgres', 'doit commencer par postgres://'),
  PROCESSING_URL: z.url().default('http://127.0.0.1:8000'),
  // Secret partagé avec processing (même valeur des deux côtés). Obligatoire en ligne.
  PROCESSING_TOKEN: z.string().optional(),
  // Adresse de l'application, pour les liens des e-mails et le retour de Google.
  APP_URL: z.url().default('http://localhost:3000'),
  // E-mails envoyés avec Resend (le même en local et en ligne). Absente : aucun e-mail ne part.
  RESEND_API_KEY: z.string().optional(),
  // Expéditeur : une adresse d'un domaine vérifié dans Resend. Par défaut, celle de test de Resend,
  // qui n'envoie qu'à l'adresse du compte Resend.
  MAIL_FROM: z.string().default('Vyra <onboarding@resend.dev>'),
  // Connexion avec Google (facultative) : identifiants OAuth créés dans la console Google Cloud.
  // Absents : le bouton « Continuer avec Google » n'apparaît pas.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  // Graine de la clé qui scelle les conclusions (Ed25519) : au moins 32 caractères, à garder.
  // La changer invalide tous les sceaux déjà imprimés. Absente : une clé de développement en
  // local, et aucun sceau en production.
  SEAL_SECRET: z.string().min(32, 'au moins 32 caractères').optional(),
  // Comptes de démo en un clic (dont un admin) et remise à zéro des données. Absente : actif sur
  // le PC, coupé en production. `true` en ligne seulement le temps d'une présentation.
  DEMO_MODE: z.stringbool().optional(),
});

// Variables `NEXT_PUBLIC_*` : copiées dans le code envoyé au navigateur, donc jamais de secret.
// Next.js ne remplace que les références écrites en toutes lettres (`process.env.NEXT_PUBLIC_X`).
const publicSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().default('Vyra'),
});
const publicSource = {
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
};

// Une ligne `CLE=` dans un fichier .env donne une chaîne vide : on la traite comme absente.
function withoutEmptyValues(source: Record<string, string | undefined>) {
  return Object.fromEntries(Object.entries(source).filter(([, value]) => value !== ''));
}

function parseEnv<T extends z.ZodType>(schema: T, source: Record<string, string | undefined>) {
  const values = withoutEmptyValues(source);
  const result = schema.safeParse(values);
  if (result.success) return result.data;

  const problems = result.error.issues.map((issue) => {
    const name = String(issue.path[0]);
    return `  - ${name} : ${values[name] === undefined ? 'variable manquante' : issue.message}`;
  });
  throw new Error(
    `Variables d'environnement invalides (voir web/.env.example) :\n${problems.join('\n')}`,
  );
}

export const env = parseEnv(serverSchema, process.env);
export const demoMode = env.DEMO_MODE ?? env.NODE_ENV !== 'production';
// La remise à zéro efface TOUTES les affaires et TOUS les comptes, pas seulement ceux de la démo.
// Jamais en production : avec DEMO_MODE=true en ligne, n'importe qui entre en un clic comme
// vérificateur de démo, et pourrait effacer les comptes des vraies personnes. En local seulement.
export const demoResetAllowed = demoMode && env.NODE_ENV !== 'production';
export const publicEnv = parseEnv(publicSchema, publicSource);
