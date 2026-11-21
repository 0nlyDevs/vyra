import type { FeedKind, FeedRegion } from '@/lib/domain';

// Les sources du fil d'actualité : toutes publiques, lues sans compte par le service processing.
// Testées le 21 novembre 2026. Kolo TV et Viva TV n'ont rien dans leur flux YouTube, RTA ne
// publie plus depuis 2024, Google Trends ne couvre pas Madagascar, et Reddit, Telegram, AFP
// Factuel et Google News ne répondaient pas depuis Docker.
//
// `type` : comment la lire. `target` : l'adresse du flux, ou le texte cherché pour `facebook`.

export type FeedSourceType = 'rss' | 'youtube' | 'mastodon' | 'google-trends' | 'facebook';

export type FeedSource = {
  name: string;
  type: FeedSourceType;
  target: string;
  kind: FeedKind;
  region: FeedRegion;
};

const youtube = (channelId: string) =>
  `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
const trends = (geo: string) => `https://trends.google.com/trending/rss?geo=${geo}`;

export const FEED_SOURCES: FeedSource[] = [
  // Madagascar : presse locale, et presse étrangère quand elle parle de Madagascar.
  {
    name: 'Midi Madagasikara',
    type: 'rss',
    target: 'https://midi-madagasikara.mg/feed/',
    kind: 'press',
    region: 'mg',
  },
  {
    name: '2424.mg',
    type: 'rss',
    target: 'https://www.2424.mg/feed/',
    kind: 'press',
    region: 'mg',
  },
  {
    name: 'Madagascar Tribune',
    type: 'rss',
    target: 'https://www.madagascar-tribune.com/spip.php?page=backend',
    kind: 'press',
    region: 'mg',
  },
  {
    name: 'Le Monde · Madagascar',
    type: 'rss',
    target: 'https://www.lemonde.fr/madagascar/rss_full.xml',
    kind: 'press',
    region: 'mg',
  },
  {
    name: 'France 24 · Madagascar',
    type: 'rss',
    target: 'https://www.france24.com/fr/tag/madagascar/rss',
    kind: 'press',
    region: 'mg',
  },
  // Madagascar : télévisions (YouTube), Facebook public (Tavily) et Mastodon.
  {
    name: 'TV Plus Madagascar',
    type: 'youtube',
    target: youtube('UCEGz7uOqsNyHZZTlPtzMBmw'),
    kind: 'tv',
    region: 'mg',
  },
  {
    name: 'Newsmada TV',
    type: 'youtube',
    target: youtube('UCKG642SNXmizqQNgxNMVU-A'),
    kind: 'tv',
    region: 'mg',
  },
  {
    name: 'Facebook',
    type: 'facebook',
    target: 'vaovao Madagasikara',
    kind: 'facebook',
    region: 'mg',
  },
  {
    name: 'Facebook',
    type: 'facebook',
    target: 'Madagascar actualité',
    kind: 'facebook',
    region: 'mg',
  },
  {
    name: 'Mastodon #madagascar',
    type: 'mastodon',
    target: 'https://piaille.fr/api/v1/timelines/tag/madagascar?limit=40',
    kind: 'social',
    region: 'mg',
  },
  // Monde : presse, vérifications, tendances de recherche et réseaux.
  { name: 'RFI', type: 'rss', target: 'https://www.rfi.fr/fr/rss', kind: 'press', region: 'world' },
  {
    name: 'Le Monde · International',
    type: 'rss',
    target: 'https://www.lemonde.fr/international/rss_full.xml',
    kind: 'press',
    region: 'world',
  },
  {
    name: 'BBC World',
    type: 'rss',
    target: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    kind: 'press',
    region: 'world',
  },
  {
    name: 'Les Décodeurs (Le Monde)',
    type: 'rss',
    target: 'https://www.lemonde.fr/les-decodeurs/rss_full.xml',
    kind: 'factcheck',
    region: 'world',
  },
  {
    name: 'Les Observateurs (France 24)',
    type: 'rss',
    target: 'https://observers.france24.com/fr/rss',
    kind: 'factcheck',
    region: 'world',
  },
  {
    name: 'Tendances · France',
    type: 'google-trends',
    target: trends('FR'),
    kind: 'trend',
    region: 'world',
  },
  {
    name: 'Tendances · États-Unis',
    type: 'google-trends',
    target: trends('US'),
    kind: 'trend',
    region: 'world',
  },
  {
    name: 'Tendances · Afrique du Sud',
    type: 'google-trends',
    target: trends('ZA'),
    kind: 'trend',
    region: 'world',
  },
  {
    name: 'Tendances · Nigeria',
    type: 'google-trends',
    target: trends('NG'),
    kind: 'trend',
    region: 'world',
  },
  {
    name: 'Mastodon · tendances',
    type: 'mastodon',
    target: 'https://piaille.fr/api/v1/trends/statuses?limit=40',
    kind: 'social',
    region: 'world',
  },
];

// Retrouve la source d'une publication par son nom (les recherches Facebook partagent le leur).
export function sourceByName(name: string) {
  return FEED_SOURCES.find((source) => source.name === name) ?? null;
}
