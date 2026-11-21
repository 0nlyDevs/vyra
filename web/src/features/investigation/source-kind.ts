import type { SourceKind } from '@/lib/domain';

// Le type d'une source, d'après son adresse (site connu, réseau social…) ou, sans adresse,
// d'après son nom (« Message transféré », « page de réseau social »…). Liste à compléter.

const PRESS = [
  'afp.com',
  'apnews.com',
  'bbc.com',
  'bbc.co.uk',
  'france24.com',
  'franceinfo.fr',
  'francetvinfo.fr',
  'jeuneafrique.com',
  'lefigaro.fr',
  'lemonde.fr',
  'liberation.fr',
  'nytimes.com',
  'reuters.com',
  'rfi.fr',
  'theconversation.com',
  'theguardian.com',
  'washingtonpost.com',
  // Presse malgache et de l'océan Indien.
  '2424.mg',
  'lexpress.mg',
  'lagazette-dgi.com',
  'linfo.re',
  'madagascar-tribune.com',
  'midi-madagasikara.mg',
  'newsmada.com',
  'clicanoo.re',
];

const SOCIAL = [
  'facebook.com',
  'fb.com',
  'instagram.com',
  'linkedin.com',
  't.me',
  'telegram.me',
  'threads.net',
  'tiktok.com',
  'twitter.com',
  'x.com',
  'youtube.com',
  'youtu.be',
];

const FORUM = ['reddit.com', 'quora.com', 'stackexchange.com', 'jeuxvideo.com'];
const BLOG = ['blogspot.com', 'medium.com', 'over-blog.com', 'substack.com', 'wordpress.com'];
const OFFICIAL_SUFFIXES = ['.gov', '.gouv.fr', '.gov.mg', '.gouv.mg', '.int', '.un.org'];

function matches(host: string, domains: string[]) {
  return domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

export function sourceKind(sourceUrl: string | null, sourceName: string): SourceKind {
  if (sourceUrl) {
    let host = '';
    try {
      host = new URL(sourceUrl).hostname.replace(/^www\./, '');
    } catch {
      host = '';
    }
    if (host) {
      if (matches(host, PRESS)) return 'press';
      if (OFFICIAL_SUFFIXES.some((suffix) => host.endsWith(suffix))) return 'official';
      if (matches(host, SOCIAL)) return 'social';
      if (matches(host, FORUM) || /^forums?\./.test(host) || sourceUrl.includes('/forum')) {
        return 'forum';
      }
      if (matches(host, BLOG) || host.includes('blog')) return 'blog';
      return 'website';
    }
  }
  if (/message transféré|whatsapp|messenger|sms/i.test(sourceName)) return 'messaging';
  if (/officiel|ministère|mairie|régie|office/i.test(sourceName)) return 'official';
  if (/réseau social|facebook|tiktok/i.test(sourceName)) return 'social';
  if (/forum|reddit/i.test(sourceName)) return 'forum';
  if (/blog/i.test(sourceName)) return 'blog';
  if (/journal|courrier|radio|presse|télé|tv\b/i.test(sourceName)) return 'media';
  return 'unknown';
}
