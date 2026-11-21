import { Check, Minus } from 'lucide-react';
import { Reveal } from '@/components/motion/Reveal';

// Ce qui nous distingue d'un chatbot, en trois lignes face à face.

const ROWS = [
  {
    chatbot: 'Donne une réponse.',
    mindstack: 'Montre l’histoire de l’information, version par version.',
  },
  {
    chatbot: 'Donne un avis convaincant.',
    mindstack: 'Fait plaider les deux camps, puis vous laisse juger.',
  },
  {
    chatbot: 'Répond toujours.',
    mindstack: 'Dit « informations insuffisantes » quand les preuves manquent.',
  },
];

export function Comparison() {
  return (
    <section
      id="difference"
      aria-labelledby="comparison-title"
      className="mx-auto grid max-w-[84rem] scroll-mt-24 gap-12 px-5 py-24 lg:px-10"
    >
      <div className="grid max-w-3xl gap-5">
        <p className="eyebrow">La différence</p>
        <h2 id="comparison-title" className="display text-[clamp(2rem,4.4vw,3.6rem)]">
          Un chatbot répond toujours. MindStack répond avec des preuves.
        </h2>
      </div>
      <Reveal className="bezel">
        <div className="bezel-core">
          <div className="grid grid-cols-2 border-b font-medium text-sm">
            <span className="px-6 py-4 text-muted-foreground">Un chatbot</span>
            <span className="px-6 py-4 text-primary">MindStack</span>
          </div>
          {ROWS.map((row) => (
            <div key={row.chatbot} className="grid grid-cols-2 border-b last:border-b-0">
              <p className="flex items-start gap-3 px-6 py-5 text-muted-foreground">
                <Minus aria-hidden className="mt-1 size-4 shrink-0 opacity-60" />
                {row.chatbot}
              </p>
              <p className="flex items-start gap-3 px-6 py-5 font-medium">
                <Check aria-hidden className="mt-1 size-4 shrink-0 text-primary" />
                {row.mindstack}
              </p>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
