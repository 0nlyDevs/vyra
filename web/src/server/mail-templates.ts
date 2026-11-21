import 'server-only';
import type { Mail } from '@/server/mail';

// Textes des e-mails : une version HTML simple (styles en ligne, lus par toutes les messageries)
// et une version texte. Toujours en français.

const RED = '#c8343a';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function layout(title: string, paragraphs: string[], button?: { label: string; url: string }) {
  const body = paragraphs
    .map((text) => `<p style="margin:0 0 16px;line-height:1.6">${escapeHtml(text)}</p>`)
    .join('');
  const cta = button
    ? `<p style="margin:24px 0"><a href="${escapeHtml(button.url)}" style="background:${RED};color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;display:inline-block">${escapeHtml(button.label)}</a></p><p style="margin:0 0 16px;font-size:13px;color:#666">Si le bouton ne marche pas, copiez ce lien : ${escapeHtml(button.url)}</p>`
    : '';
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f6f4f4;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1d1a1a"><div style="max-width:520px;margin:0 auto;padding:32px 20px"><p style="margin:0 0 24px;font-weight:700;color:${RED}">Vyra</p><div style="background:#fff;border-radius:14px;padding:28px"><h1 style="margin:0 0 16px;font-size:20px">${escapeHtml(title)}</h1>${body}${cta}</div><p style="margin:20px 0 0;font-size:12px;color:#888">Vous recevez cet e-mail parce qu'un compte Vyra utilise cette adresse.</p></div></body></html>`;
}

export function verifyEmailMail(to: string, name: string, url: string): Mail {
  const lines = [
    `Bonjour ${name},`,
    'Bienvenue sur Vyra. Confirmez votre adresse e-mail pour recevoir les résultats de vos signalements.',
    'Ce lien est valable 24 heures.',
  ];
  return {
    to,
    subject: 'Confirmez votre adresse e-mail',
    text: `${lines.join('\n\n')}\n\nConfirmer mon adresse : ${url}`,
    html: layout('Confirmez votre adresse e-mail', lines, { label: 'Confirmer mon adresse', url }),
  };
}

export function resetPasswordMail(to: string, name: string, url: string): Mail {
  const lines = [
    `Bonjour ${name},`,
    'Vous avez demandé un nouveau mot de passe. Ce lien est valable 1 heure.',
    'Si vous n’avez rien demandé, ignorez cet e-mail : votre mot de passe ne change pas.',
  ];
  return {
    to,
    subject: 'Choisissez un nouveau mot de passe',
    text: `${lines.join('\n\n')}\n\nChoisir un nouveau mot de passe : ${url}`,
    html: layout('Choisissez un nouveau mot de passe', lines, {
      label: 'Choisir un nouveau mot de passe',
      url,
    }),
  };
}

export function welcomeMail(to: string, name: string, url: string): Mail {
  const lines = [
    `Bonjour ${name},`,
    'Votre compte Vyra est créé avec Google. Vous pouvez suivre une information, l’envoyer au tribunal et signaler un contenu suspect.',
  ];
  return {
    to,
    subject: 'Bienvenue sur Vyra',
    text: `${lines.join('\n\n')}\n\nOuvrir Vyra : ${url}`,
    html: layout('Bienvenue sur Vyra', lines, { label: 'Ouvrir Vyra', url }),
  };
}
