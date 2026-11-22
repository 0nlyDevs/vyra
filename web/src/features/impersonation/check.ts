import { type DiffPart, diffWords } from '@/features/investigation/word-diff';
import { significantWords, wordOverlap } from '@/features/investigation/word-match';
import type { InstitutionChannels } from '@/server/db/schema';

// « Est-ce bien eux ? » : un message qui se réclame d'une institution est comparé, par du code et
// sans IA, aux canaux officiels de l'annuaire et aux communiqués d'origine. On relève des faits
// (canal officiel ou non, adresse qui en imite une, demande d'argent, texte modifié), jamais un
// verdict : un canal inconnu de l'annuaire n'est pas forcément faux.

export type DirectoryEntry = {
  id: string;
  name: string;
  aliases: string[];
  channels: InstitutionChannels;
  never: string;
  notices: { id: string; title: string; content: string; publishedAt: Date | null }[];
};

export type ChannelKind = 'domain' | 'phone' | 'page' | 'sender';
export type ChannelStatus = 'official' | 'lookalike' | 'not_listed';
export type ChannelFinding = {
  kind: ChannelKind;
  value: string;
  status: ChannelStatus;
  // L'institution dont c'est le canal officiel, ou celle qu'il imite, ou celle qu'il prétend être.
  institution: string | null;
  // Pour une imitation : le canal officiel imité.
  imitates?: string;
};

export type NoticeMatch = {
  institution: string;
  title: string;
  content: string;
  publishedAt: Date | null;
  // L'original (mots retirés) et le message (mots ajoutés), mot à mot.
  diff: { before: DiffPart[]; after: DiffPart[] };
  // Nombres du message absents du communiqué (« 10 jours » quand l'original dit « 10 h à 14 h »).
  changedFigures: string[];
};

export type ImpersonationReport = {
  claimed: { id: string; name: string; never: string }[];
  channels: ChannelFinding[];
  asksForMoney: string[];
  notice: NoticeMatch | null;
};

// ─── Lire les canaux d'un texte ─────────────────────────────────────────────────────────────

function plain(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[’']/g, ' ');
}

export function normalizeDomain(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/^[a-z]+:\/\//, '')
    .replace(/^www\./, '')
    .replace(/[/?#:].*$/, '')
    .replace(/\.$/, '');
}

// Un numéro de Madagascar s'écrit +261 34 00 001 01, 00261…, ou 034 00 001 01 : on garde les 9
// derniers chiffres. Un numéro étranger garde tous ses chiffres.
export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('00261')) return digits.slice(5);
  if (digits.startsWith('261') && digits.length === 12) return digits.slice(3);
  if (digits.startsWith('0') && digits.length === 10) return digits.slice(1);
  return digits;
}

export function normalizePage(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/^[a-z]+:\/\//, '')
    .replace(/^(www|m|web)\./, '')
    .replace(/[?#].*$/, '')
    .replace(/\/+$/, '');
}

const SOCIAL = /^(facebook\.com|fb\.com|tiktok\.com|instagram\.com|x\.com|twitter\.com|t\.me)$/;
const URL_PATTERN = /\b(https?:\/\/|www\.)?((?:[a-z0-9-]+\.)+[a-z]{2,})(\/[^\s<>"«»)]*)?/gi;
// Sans « http » ni « www », un mot avec un point n'est une adresse que si son extension est
// courante : « M.Rakoto » ou « etc.Il » ne sont pas des sites.
const COMMON_TLDS = new Set(
  'mg com net org info fr io co me app site online xyz top link click gov edu biz live shop store pro club page'.split(
    ' ',
  ),
);
const EMAIL_PATTERN = /\b[a-z0-9._%+-]+@((?:[a-z0-9-]+\.)+[a-z]{2,})\b/gi;
// 034 00 001 01, +261 34 00 001 01, 0340000101… (au moins 9 chiffres, espaces et points permis).
const PHONE_PATTERN = /(?:\+|00)?\d[\d .-]{7,}\d/g;
// Un nom d'expéditeur SMS : quelques capitales, chiffres ou tirets (« REGIE-EAUX »).
const SENDER_PATTERN = /\b[A-Z][A-Z0-9-]{2,10}\b/g;

// Les canaux écrits dans un texte. Les noms d'expéditeur ne se lisent que dans `sender` (ce que
// le téléphone affiche comme expéditeur) : dans le corps du message, n'importe qui peut les écrire.
export function extractChannels(text: string, sender = '') {
  const domains = new Set<string>();
  const pages = new Set<string>();
  const phones = new Set<string>();
  const senders = new Set<string>();
  for (const match of text.matchAll(EMAIL_PATTERN)) domains.add(normalizeDomain(match[1] ?? ''));
  const withoutEmails = text.replace(EMAIL_PATTERN, ' ');
  for (const match of withoutEmails.matchAll(URL_PATTERN)) {
    const domain = normalizeDomain(match[2] ?? '');
    const tld = domain.split('.').at(-1) ?? '';
    if (!match[1] && !COMMON_TLDS.has(tld)) continue;
    if (SOCIAL.test(domain)) {
      // La ponctuation collée à la fin d'un lien (« …/regie, » « …/regie. ») n'en fait pas partie.
      const path = (match[3] ?? '')
        .replace(/[.,;:!?…]+$/, '')
        .split(/[/?#]/)
        .filter(Boolean)[0];
      if (path) pages.add(`${domain === 'fb.com' ? 'facebook.com' : domain}/${path.toLowerCase()}`);
    } else if (domain) {
      domains.add(domain);
    }
  }
  for (const match of withoutEmails.replace(URL_PATTERN, ' ').matchAll(PHONE_PATTERN)) {
    const phone = normalizePhone(match[0]);
    if (phone.length >= 9 && phone.length <= 13) phones.add(phone);
  }
  for (const match of sender.toUpperCase().matchAll(SENDER_PATTERN)) senders.add(match[0]);
  return { domains: [...domains], pages: [...pages], phones: [...phones], senders: [...senders] };
}

// ─── Reconnaître une imitation ──────────────────────────────────────────────────────────────

function distance(a: string, b: string) {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0] ?? 0;
    previous[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = previous[j] ?? 0;
      previous[j] = Math.min(
        above + 1,
        (previous[j - 1] ?? 0) + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return previous[b.length] ?? 0;
}

// Les lettres qu'on confond à l'œil : « 0 » pour « o », « 1 » ou « I » pour « l », « rn » pour « m ».
function skeleton(value: string) {
  return value
    .replace(/rn/g, 'm')
    .replace(/vv/g, 'w')
    .replace(/0/g, 'o')
    .replace(/[1i|]/g, 'l')
    .replace(/[-_.]/g, '');
}

// Le nom d'un domaine sans son extension (« regie-eaux » pour « regie-eaux.mg »).
function domainName(domain: string) {
  const parts = domain.split('.');
  return parts.length > 1 ? parts.slice(0, -1).join('.') : domain;
}

// Une adresse imite-t-elle un domaine officiel ? Même nom avec une autre extension
// (regie-eaux.com pour regie-eaux.mg), nom officiel plus un mot (regie-eaux-paiement.mg), une ou
// deux lettres changées, ou des lettres qui se ressemblent.
export function imitatesDomain(candidate: string, official: string) {
  if (candidate === official || candidate.endsWith(`.${official}`)) return false;
  const name = domainName(official);
  const candidateName = domainName(candidate);
  if (name.length < 4) return false;
  if (candidateName === name) return true;
  if (candidateName.includes(name) || candidate.includes(`${name}.`)) return true;
  if (skeleton(candidateName) === skeleton(name)) return true;
  return distance(candidateName, name) <= (name.length >= 8 ? 2 : 1);
}

function imitatesPage(candidate: string, official: string) {
  if (candidate === official) return false;
  const [site, handle = ''] = official.split('/');
  const [candidateSite, candidateHandle = ''] = candidate.split('/');
  if (site !== candidateSite || handle.length < 4) return false;
  return (
    candidateHandle.includes(handle) ||
    skeleton(candidateHandle) === skeleton(handle) ||
    distance(candidateHandle, handle) <= 2
  );
}

// ─── Ce que le message demande ──────────────────────────────────────────────────────────────

const MONEY = [
  'mvola',
  'm-vola',
  'orange money',
  'airtel money',
  'mobile money',
  'payez',
  'payer',
  'paiement',
  'frais de dossier',
  'frais d inscription',
  'envoyez',
  'transfert',
  'virement',
  'code secret',
  'code pin',
  'code de confirmation',
  'mot de passe',
  'mandoa',
  'alefaso',
];

function moneyRequests(text: string) {
  const normalized = ` ${plain(text).replace(/[^\p{L}\p{N}]+/gu, ' ')} `;
  const found = MONEY.filter((word) => normalized.includes(` ${word} `));
  // Un prix seul (« forfait à 5 000 Ar ») n'est pas une demande : il faut aussi un mot de paiement.
  if (found.length > 0 && /\b\d[\d\s.]*\s?(ar|ariary|mga)\b/i.test(text)) {
    found.push('somme en ariary');
  }
  return [...new Set(found)];
}

// ─── Le rapport ─────────────────────────────────────────────────────────────────────────────

function mentions(text: string, entry: DirectoryEntry) {
  const normalized = ` ${plain(text).replace(/[^\p{L}\p{N}]+/gu, ' ')} `;
  return [entry.name, ...entry.aliases].some((name) => {
    const key = plain(name)
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();
    return key.length >= 3 && normalized.includes(` ${key} `);
  });
}

// Les chiffres d'un texte avec leur unité (« 10 jours », « 5 000 Ar », « 14 h »), sans les
// numéros de téléphone ni les adresses. Clé : le nombre sans séparateurs et le début de l'unité,
// pour que « 10 h » et « 10 jours » diffèrent.
const FIGURE = /(\d{1,3}(?:[ \u00a0.]\d{3})+|\d+)(?:[.,]\d+)?(?:\s*([\p{L}%]+))?/gu;

function figures(text: string) {
  const cleaned = text
    .replace(EMAIL_PATTERN, ' ')
    .replace(URL_PATTERN, ' ')
    .replace(PHONE_PATTERN, (match) => (normalizePhone(match).length >= 9 ? ' ' : match));
  const found = new Map<string, string>();
  for (const match of cleaned.matchAll(FIGURE)) {
    const number = (match[1] ?? '').replace(/[ \u00a0.]/g, '');
    const unit = plain(match[2] ?? '').slice(0, 4);
    found.set(`${number} ${unit}`, match[0].trim());
  }
  return found;
}

// Le communiqué d'origine le plus proche, parmi ceux des institutions citées (sinon de toutes).
function closestNotice(text: string, entries: DirectoryEntry[]): NoticeMatch | null {
  const words = significantWords(text);
  let best: { score: number; match: NoticeMatch } | null = null;
  for (const entry of entries) {
    for (const notice of entry.notices) {
      // Part du communiqué qu'on retrouve dans le message : un faux reprend l'original puis ajoute
      // beaucoup (un lien, une demande d'argent), ce qui ferait baisser la part inverse.
      const { shared, ratio } = wordOverlap(significantWords(notice.content), words);
      const score = shared >= 3 ? ratio : 0;
      if (score < 0.25 || (best && best.score >= score)) continue;
      const original = figures(notice.content);
      best = {
        score,
        match: {
          institution: entry.name,
          title: notice.title,
          content: notice.content,
          publishedAt: notice.publishedAt,
          diff: diffWords(notice.content, text),
          changedFigures: [...figures(text)]
            .filter(([key]) => !original.has(key))
            .map(([, shown]) => shown),
        },
      };
    }
  }
  return best?.match ?? null;
}

export function checkImpersonation(
  message: string,
  sender: string,
  directory: DirectoryEntry[],
): ImpersonationReport {
  const all = `${sender}\n${message}`;
  const claimed = directory.filter((entry) => mentions(all, entry));
  const found = extractChannels(all, sender);
  const channels: ChannelFinding[] = [];
  const claimedName = claimed.length === 1 ? (claimed[0]?.name ?? null) : null;

  for (const domain of found.domains) {
    const owner = directory.find((entry) =>
      entry.channels.domains.some(
        (official) => domain === official || domain.endsWith(`.${official}`),
      ),
    );
    if (owner) {
      channels.push({ kind: 'domain', value: domain, status: 'official', institution: owner.name });
      continue;
    }
    const copied = directory
      .flatMap((entry) => entry.channels.domains.map((official) => ({ entry, official })))
      .find(({ official }) => imitatesDomain(domain, official));
    channels.push(
      copied
        ? {
            kind: 'domain',
            value: domain,
            status: 'lookalike',
            institution: copied.entry.name,
            imitates: copied.official,
          }
        : { kind: 'domain', value: domain, status: 'not_listed', institution: claimedName },
    );
  }

  for (const page of found.pages) {
    const owner = directory.find((entry) => entry.channels.pages.includes(page));
    if (owner) {
      channels.push({ kind: 'page', value: page, status: 'official', institution: owner.name });
      continue;
    }
    const copied = directory
      .flatMap((entry) => entry.channels.pages.map((official) => ({ entry, official })))
      .find(({ official }) => imitatesPage(page, official));
    channels.push(
      copied
        ? {
            kind: 'page',
            value: page,
            status: 'lookalike',
            institution: copied.entry.name,
            imitates: copied.official,
          }
        : { kind: 'page', value: page, status: 'not_listed', institution: claimedName },
    );
  }

  for (const phone of found.phones) {
    const owner = directory.find((entry) => entry.channels.phones.includes(phone));
    channels.push(
      owner
        ? { kind: 'phone', value: phone, status: 'official', institution: owner.name }
        : { kind: 'phone', value: phone, status: 'not_listed', institution: claimedName },
    );
  }

  // Un nom d'expéditeur ne compte que s'il est déclaré dans l'annuaire : sinon c'est un sigle.
  for (const name of found.senders) {
    const owner = directory.find((entry) => entry.channels.senders.includes(name));
    if (owner) {
      channels.push({ kind: 'sender', value: name, status: 'official', institution: owner.name });
    }
  }

  return {
    claimed: claimed.map((entry) => ({ id: entry.id, name: entry.name, never: entry.never })),
    channels,
    asksForMoney: moneyRequests(message),
    notice: closestNotice(message, claimed.length > 0 ? claimed : directory),
  };
}

// Un numéro tel qu'on l'écrit à Madagascar : 034 00 001 01.
export function formatPhone(phone: string) {
  if (phone.length !== 9) return phone;
  return `0${phone.slice(0, 2)} ${phone.slice(2, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
}
