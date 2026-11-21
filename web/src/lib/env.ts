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
  // Serveur d'envoi des e-mails. Par défaut : Mailpit (docker-compose.yml), qui les affiche sur
  // http://localhost:8025 sans les envoyer vraiment.
  SMTP_URL: z
    .string()
    .startsWith('smtp', 'doit commencer par smtp:// ou smtps://')
    .default('smtp://127.0.0.1:1025'),
  MAIL_FROM: z.string().default('Vyra <no-reply@mindstack.local>'),
  // Connexion avec Google (facultative) : identifiants OAuth créés dans la console Google Cloud.
  // Absents : le bouton « Continuer avec Google » n'apparaît pas.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
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
export const publicEnv = parseEnv(publicSchema, publicSource);
