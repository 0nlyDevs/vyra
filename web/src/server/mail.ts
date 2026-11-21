import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

// Envoi des e-mails. Par défaut vers Mailpit (docker-compose.yml) : les e-mails n'arrivent chez
// personne, ils s'affichent sur http://localhost:8025. Un vrai serveur : changer SMTP_URL.
// Un e-mail qui ne part pas ne bloque jamais l'action : on l'écrit dans les journaux.

let transport: Transporter | null = null;

export type Mail = { to: string; subject: string; text: string; html: string };

export async function sendMail(mail: Mail) {
  try {
    transport ??= nodemailer.createTransport(env.SMTP_URL);
    await transport.sendMail({ from: env.MAIL_FROM, ...mail });
    return true;
  } catch (error) {
    logger.warn('e-mail : envoi impossible', {
      subject: mail.subject,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return false;
  }
}
