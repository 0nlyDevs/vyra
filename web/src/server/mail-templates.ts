import 'server-only';
import type { Mail } from '@/server/mail';

// Textes des e-mails : une version HTML (styles en ligne et tableaux, lus par toutes les
// messageries, Outlook compris) et une version texte. Toujours en français. Même design que
// l'application, « encre et papier » : fond papier, encre pour l'action, aucune couleur (elle est
// réservée aux verdicts).

const INK = '#0a0a0b';
const PAPER = '#f3f2ee';
const MUTED = '#55544e';
const BORDER = '#e2e1dc';
const SANS = "'Bricolage Grotesque',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const SERIF = "'Cormorant Garamond',Georgia,'Times New Roman',serif";

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

// Une lettre, pas une carte : alignée à gauche sur le papier, grand titre, texte à taille de lecture,
// un seul bouton en encre et un filet fin avant le pied de page.
function layout(title: string, paragraphs: string[], button?: { label: string; url: string }) {
  // L'aperçu affiché dans la liste des e-mails : la première phrase après « Bonjour ».
  const preview = escapeHtml(paragraphs[1] ?? paragraphs[0] ?? '');
  const body = paragraphs
    .map(
      (text) =>
        `<p style="margin:0 0 18px;font-size:17px;line-height:1.65;color:${INK}">${escapeHtml(text)}</p>`,
    )
    .join('');
  const cta = button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:36px 0 28px"><tr><td style="border-radius:999px;background:${INK}"><a href="${escapeHtml(button.url)}" style="display:inline-block;padding:16px 30px;font-family:${SANS};font-size:17px;font-weight:600;color:${PAPER};text-decoration:none;border-radius:999px">${escapeHtml(button.label)}</a></td></tr></table><p style="margin:0;font-size:14px;line-height:1.6;color:${MUTED}">Si le bouton ne s’ouvre pas, copiez ce lien dans votre navigateur :<br><a href="${escapeHtml(button.url)}" style="color:${MUTED};word-break:break-all">${escapeHtml(button.url)}</a></p>`
    : '';
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${escapeHtml(title)}</title></head><body style="margin:0;padding:0;background:${PAPER};font-family:${SANS};color:${INK};-webkit-font-smoothing:antialiased"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${preview}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER}"><tr><td align="left" style="padding:56px 32px 48px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px"><tr><td style="padding:0 0 56px;font-family:${SANS};font-size:26px;font-weight:800;letter-spacing:-0.04em;color:${INK}">Vyra<span style="font-family:${SERIF};font-style:italic;font-weight:500">.</span></td></tr><tr><td><h1 style="margin:0 0 28px;font-family:${SANS};font-size:34px;line-height:1.15;font-weight:700;letter-spacing:-0.03em;color:${INK}">${escapeHtml(title)}</h1>${body}${cta}</td></tr><tr><td style="padding:48px 0 0"><div style="border-top:1px solid ${BORDER};padding-top:20px;font-size:13px;line-height:1.6;color:${MUTED}">Vous recevez cet e-mail parce qu’un compte Vyra utilise cette adresse.<br>Vyra · vérifier avant de partager</div></td></tr></table></td></tr></table></body></html>`;
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
