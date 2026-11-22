import 'server-only';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

// Envoi des e-mails avec Resend, le même service en local et en ligne. Sans RESEND_API_KEY, rien
// ne part : l'erreur est écrite dans les journaux. Un e-mail qui ne part pas ne bloque jamais l'action.

export type Mail = { to: string; subject: string; text: string; html: string };

export async function sendMail(mail: Mail) {
  try {
    if (!env.RESEND_API_KEY) throw new Error('RESEND_API_KEY absente');
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: env.MAIL_FROM, ...mail }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Resend a répondu ${response.status}`);
    return true;
  } catch (error) {
    logger.warn('e-mail : envoi impossible', {
      subject: mail.subject,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return false;
  }
}
