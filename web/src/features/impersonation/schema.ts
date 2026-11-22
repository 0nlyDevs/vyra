import { z } from 'zod';
import { normalizeDomain, normalizePage, normalizePhone } from './check';

// Formes des données de « Est-ce bien eux ? » et de l'annuaire officiel.

export const checkSchema = z.object({
  message: z
    .string()
    .trim()
    .min(10, 'Collez le message reçu (au moins quelques mots).')
    .max(4000, 'Message trop long : 4 000 caractères au maximum.'),
  sender: z.string().trim().max(200).default(''),
});

// Une liste tapée à la main : séparée par des virgules ou des retours à la ligne.
function list(normalize: (value: string) => string = (value) => value.trim()) {
  return z
    .string()
    .max(2000)
    .default('')
    .transform((value) =>
      [
        ...new Set(
          value
            .split(/[,\n]/)
            .map((item) => normalize(item.trim()))
            .filter((item) => item.length > 0),
        ),
      ].slice(0, 20),
    );
}

export const institutionSchema = z.object({
  name: z.string().trim().min(3, 'Nom trop court.').max(120),
  aliases: list(),
  domains: list(normalizeDomain),
  phones: list(normalizePhone).refine(
    (phones) => phones.every((phone) => phone.length >= 9 && phone.length <= 13),
    'Un numéro a de 9 à 13 chiffres (034 00 001 01, +261 34 00 001 01).',
  ),
  pages: list(normalizePage),
  senders: list((value) => value.toUpperCase()),
  never: z.string().trim().max(300).default(''),
});

export const noticeSchema = z.object({
  institutionId: z.uuid(),
  title: z.string().trim().min(3, 'Titre trop court.').max(160),
  content: z.string().trim().min(20, 'Recopiez le communiqué en entier.').max(4000),
  sourceUrl: z
    .union([z.literal(''), z.url({ protocol: /^https?$/, error: 'Adresse invalide (https://…).' })])
    .default('')
    .transform((value) => value || null),
  publishedAt: z
    .union([z.literal(''), z.iso.date('Date invalide.')])
    .default('')
    .transform((value) => (value ? new Date(`${value}T12:00:00Z`) : null)),
});
