import {
  type LucideIcon,
  MessageCircle,
  Newspaper,
  ShieldCheck,
  TrendingUp,
  Tv,
  Users,
} from 'lucide-react';
import { FEED_REACH_UNITS, type FeedKind } from '@/lib/domain';
import type { FeedItem } from '@/server/dal/feed';

export const KIND_ICONS = {
  press: Newspaper,
  tv: Tv,
  facebook: Users,
  social: MessageCircle,
  trend: TrendingUp,
  factcheck: ShieldCheck,
} satisfies Record<FeedKind, LucideIcon>;

const numbers = new Intl.NumberFormat('fr-FR');

export function reachLabel(item: FeedItem) {
  const unit = FEED_REACH_UNITS[item.kind];
  if (!unit || !item.reach) return null;
  // Google Trends donne un seuil (« 1000+ ») et non un compte exact.
  const suffix = item.kind === 'trend' ? '+' : '';
  return `${numbers.format(item.reach)}${suffix} ${unit}`;
}

// Le titre de la publication ; sans titre (un post), sa première phrase.
export function headlineOf(item: FeedItem) {
  if (item.title) return item.title;
  const first = item.body.split(/(?<=[.!?])\s/)[0] ?? item.body;
  return first.length > 140 ? `${first.slice(0, 137)}…` : first;
}

export function reportHrefOf(item: FeedItem) {
  const text = (item.title ? `${item.title}. ${item.body}` : item.body).slice(0, 600);
  return `/reports?post=${item.id}&text=${encodeURIComponent(text)}&url=${encodeURIComponent(item.url)}`;
}
