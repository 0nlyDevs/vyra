import type { SourceKind } from '@/lib/domain';

// Le type d'une source, d'après son adresse (site connu, réseau social…) ou, sans adresse,
// d'après son nom (« Message transféré », « page de réseau social »…). Liste à compléter.

// Rédactions spécialisées dans la vérification : avant la presse (factuel.afp.com ≠ afp.com).
// Un chemin limite le site à sa rubrique de vérification.
const FACT_CHECKERS = [
  'factuel.afp.com',
  'factcheck.afp.com',
  'africacheck.org',
  'observers.france24.com',
  'lemonde.fr/les-decodeurs',
  'francetvinfo.fr/vrai-ou-fake',
  'liberation.fr/checknews',
  '20minutes.fr/societe/desintox',
  'snopes.com',
  'politifact.com',
  'factcheck.org',
  'fullfact.org',
  'leadstories.com',
  'pesacheck.org',
  'dubawa.org',
];

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

function isFactChecker(host: string, path: string) {
  return FACT_CHECKERS.some((entry) => {
    const [domain = '', ...section] = entry.split('/');
    const prefix = section.length ? `/${section.join('/')}` : '';
    return matches(host, [domain]) && path.startsWith(prefix);
  });
}

export function sourceKind(sourceUrl: string | null, sourceName: string): SourceKind {
  if (sourceUrl) {
    let host = '';
    let path = '';
    try {
      const parsed = new URL(sourceUrl);
      host = parsed.hostname.replace(/^www\./, '');
      path = parsed.pathname;
    } catch {
      host = '';
    }
    if (host) {
      if (isFactChecker(host, path)) return 'fact_checker';
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
  if (/fact.?check|vérification|décodeurs|checknews|africa check/i.test(sourceName)) {
    return 'fact_checker';
  }
  if (/message transféré|whatsapp|messenger|sms/i.test(sourceName)) return 'messaging';
  if (/officiel|ministère|mairie|régie|office/i.test(sourceName)) return 'official';
  if (/réseau social|facebook|tiktok/i.test(sourceName)) return 'social';
  if (/forum|reddit/i.test(sourceName)) return 'forum';
  if (/blog/i.test(sourceName)) return 'blog';
  if (/journal|courrier|radio|presse|télé|tv\b/i.test(sourceName)) return 'media';
  return 'unknown';
}
