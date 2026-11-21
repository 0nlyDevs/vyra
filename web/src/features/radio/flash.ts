import { CERTAINTY_LABELS, type CertaintyLevel } from '@/lib/domain';

// Le flash radio du jour : un texte prêt à lire à l'antenne, écrit sans IA à partir des affaires
// déjà conclues. Il ne dit que ce que les audiences ont conclu, avec leur niveau de certitude.

const WORDS_PER_MINUTE = 150;
const MAX_ITEMS = 3;

// Un conseil par jour, pour finir le flash.
const TIPS = [
  'Avant de transférer un message, demandez-vous qui l’a écrit en premier.',
  'Une photo peut être vraie et dater d’il y a dix ans : cherchez sa première publication.',
  'Plus un message vous presse de partager, plus il mérite d’attendre.',
  'Un chiffre sans source n’est qu’une rumeur avec des décimales.',
  'Un vocal anonyme ne prouve rien : qui parle, et d’où le sait-il ?',
  'Quand un message dit « ils vous le cachent », cherchez ce que disent les sources officielles.',
  'Un titre choc peut trahir l’article : lisez au-delà de la première ligne.',
];

export type FlashCase = {
  title: string;
  claim: string;
  certainty: CertaintyLevel | null;
  conclusion: string | null;
};

export type Flash = { script: string; minutes: number; items: number };

export function buildFlash(input: {
  date: string;
  dayOfYear: number;
  concluded: FlashCase[];
  openTitles: string[];
}): Flash {
  const items = input.concluded.filter((item) => item.certainty).slice(0, MAX_ITEMS);
  const parts = [`Flash vérification du ${input.date}.`];

  if (items.length === 0) {
    parts.push('Aucune nouvelle affaire n’a été jugée ces derniers jours.');
  } else {
    parts.push(
      items.length === 1
        ? 'Une information qui circule a été vérifiée.'
        : `${items.length} informations qui circulent ont été vérifiées.`,
    );
    items.forEach((item, index) => {
      const level = item.certainty ? CERTAINTY_LABELS[item.certainty] : '';
      const opener = index === 0 ? 'D’abord' : index === items.length - 1 ? 'Enfin' : 'Ensuite';
      const claim = `« ${item.claim.replace(/\s+/g, ' ').trim()} »`;
      parts.push(items.length === 1 ? `Elle disait : ${claim}` : `${opener} : ${claim}`);
      parts.push(`Conclusion : ${level.toLowerCase()}. ${item.conclusion ?? ''}`.trim());
    });
  }

  if (input.openTitles.length > 0) {
    const titles = input.openTitles.slice(0, 2).map((title) => `« ${title} »`);
    parts.push(
      `Toujours en cours de vérification : ${titles.join(' et ')}. Attendez avant de partager.`,
    );
  }

  parts.push(`Le conseil du jour : ${TIPS[input.dayOfYear % TIPS.length]}`);
  parts.push('Les preuves de chaque affaire sont en ligne, ouvertes à tous, sans compte.');

  const script = parts.join('\n\n');
  const words = script.split(/\s+/).length;
  return {
    script,
    minutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE)),
    items: items.length,
  };
}
