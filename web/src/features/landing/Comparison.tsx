import { Check, Minus } from 'lucide-react';
import { Lines } from './Lines';

// Ce qui nous distingue d'un chatbot, en trois lignes face à face.

const ROWS = [
  {
    chatbot: 'Donne une réponse.',
    vyra: 'Montre l’histoire de l’information, version par version.',
  },
  {
    chatbot: 'Donne un avis convaincant.',
    vyra: 'Fait plaider les deux camps, puis vous laisse juger.',
  },
  {
    chatbot: 'Répond toujours.',
    vyra: 'Dit « informations insuffisantes » quand les preuves manquent.',
  },
];

export function Comparison() {
  return (
    <section
      id="difference"
      aria-labelledby="comparison-title"
      className="diff section wrap scroll-mt-24"
    >
      <div className="diff-head">
        <p className="eyebrow" data-reveal="fade">
          La différence
        </p>
        <Lines
          id="comparison-title"
          className="display h2-s"
          lines={[
            'Un chatbot répond toujours.',
            <>
              Vyra répond avec des <em>preuves</em>.
            </>,
          ]}
        />
      </div>
      <div className="diff-table" data-reveal="stagger">
        <div className="diff-row mono">
          <span>Un chatbot</span>
          <span className="text-primary">Vyra</span>
        </div>
        {ROWS.map((row) => (
          <div key={row.chatbot} className="diff-row">
            <p className="diff-no">
              <Minus aria-hidden className="size-4 shrink-0 opacity-60" />
              {row.chatbot}
            </p>
            <p className="diff-yes">
              <Check aria-hidden className="size-5 shrink-0 text-primary" />
              {row.vyra}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
