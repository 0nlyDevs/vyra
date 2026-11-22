import { z } from 'zod';
import { isCommonPassword, repeatsIdentity } from './common-passwords';

const email = z
  .string()
  .trim()
  .min(1, 'Écrivez votre adresse e-mail.')
  .max(200, '200 caractères au maximum.')
  .pipe(z.email('Cette adresse e-mail n’est pas valide.'));

const newPassword = z
  .string()
  .min(8, 'Au moins 8 caractères.')
  .max(128, '128 caractères au maximum.')
  .refine(
    (value) => !isCommonPassword(value),
    'Ce mot de passe est trop courant : choisissez-en un autre.',
  );

export const signUpSchema = z
  .object({
    name: z.string().trim().min(2, 'Au moins 2 caractères.').max(60, '60 caractères au maximum.'),
    email,
    password: newPassword,
  })
  .refine((value) => !repeatsIdentity(value.password, value), {
    path: ['password'],
    message: 'Le mot de passe ne doit pas être votre nom ou votre adresse e-mail.',
  });

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Écrivez votre mot de passe.').max(128),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20).max(100),
    password: newPassword,
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, {
    path: ['confirm'],
    message: 'Les deux mots de passe ne sont pas identiques.',
  });
