import { TriangleAlert } from 'lucide-react';
import { SignalBadge } from '@/components/common/SignalBadge';
import {
  DANGER_LEVEL_LABELS,
  DANGER_LEVEL_TONES,
  DANGER_SIGN_LABELS,
  TONE_LEVEL_LABELS,
  TONE_LEVEL_TONES,
  TONE_SIGN_LABELS,
} from '@/lib/domain';
import { readDanger, readTone } from './wording';

// Les signes d'alerte d'un message, lus dans ses mots (sans IA) : son ton, et le danger s'il
// continue de circuler. Chaque signe cite le passage du message. Ce n'est jamais un verdict.
export function WarningSigns({
  text,
  title = 'Signes d’alerte dans le message',
}: {
  text: string;
  title?: string;
}) {
  const tone = readTone(text);
  const danger = readDanger(text);
  const signs = [
    ...tone.signs.map((sign) => ({ label: TONE_SIGN_LABELS[sign.kind], quote: sign.quote })),
    ...danger.signs.map((sign) => ({ label: DANGER_SIGN_LABELS[sign.kind], quote: sign.quote })),
  ];

  return (
    <section className="grid gap-3 surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-semibold">
          <TriangleAlert aria-hidden className="size-5" />
          {title}
        </h3>
        <div className="flex flex-wrap gap-2">
          <SignalBadge tone={TONE_LEVEL_TONES[tone.level]}>
            {TONE_LEVEL_LABELS[tone.level]}
          </SignalBadge>
          <SignalBadge tone={DANGER_LEVEL_TONES[danger.level]}>
            {DANGER_LEVEL_LABELS[danger.level]}
          </SignalBadge>
        </div>
      </div>
      {signs.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {signs.map((sign) => (
            <li
              key={`${sign.label}-${sign.quote}`}
              className="rounded-lg bg-muted px-2.5 py-1 text-sm"
            >
              <span className="text-muted-foreground">{sign.label} :</span>{' '}
              <span className="quote text-base">« {sign.quote} »</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">
          Aucun signe d’alerte dans les mots du message. Cela ne dit rien de sa vérité.
        </p>
      )}
      <p className="text-muted-foreground text-xs">
        Relevé dans les mots du message, sans IA. Un ton alarmant invite à vérifier, il ne prouve
        pas que l’information est fausse.
      </p>
    </section>
  );
}
