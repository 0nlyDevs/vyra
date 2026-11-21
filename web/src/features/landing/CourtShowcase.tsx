import { Reveal } from '@/components/motion/Reveal';
import { HearingPreview } from './HearingPreview';

// Le tribunal, mis en avant : une audience réelle à droite, la raison d'être à gauche.
export function CourtShowcase() {
  return (
    <section
      id="tribunal"
      aria-labelledby="court-title"
      className="relative scroll-mt-24 overflow-hidden border-y"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-1/3 right-[-10%] aspect-square w-[60rem] rounded-full bg-[radial-gradient(closest-side,oklch(0.6_0.23_24/0.22),transparent)]"
      />
      <div className="relative mx-auto grid max-w-[84rem] items-center gap-12 px-5 py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:px-10">
        <div className="grid gap-6">
          <p className="eyebrow">Le tribunal</p>
          <h2 id="court-title" className="display text-[clamp(2rem,4.4vw,3.6rem)]">
            Deux IA plaident. Vous jugez.
          </h2>
          <p className="max-w-[46ch] text-[1.05rem] text-muted-foreground leading-relaxed">
            L’accusation et la défense ne citent que les pièces du dossier. Vous votez, puis le juge
            conclut avec un niveau de certitude, ou dit « informations insuffisantes ».
          </p>
          <div className="grid max-w-md grid-cols-2 gap-4 pt-2">
            <div className="grid gap-1 border-primary border-l-2 pl-4">
              <span className="display text-4xl tabular-nums">88 %</span>
              <span className="text-muted-foreground text-sm">
                de bonnes réponses en écoutant deux IA débattre
              </span>
            </div>
            <div className="grid gap-1 border-foreground/15 border-l-2 pl-4">
              <span className="display text-4xl text-muted-foreground tabular-nums">60 %</span>
              <span className="text-muted-foreground text-sm">seul, sans aide</span>
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            Personnes non expertes, d’après Khan et al., ICML 2024.
          </p>
        </div>
        <Reveal className="bezel">
          <div className="bezel-core">
            <HearingPreview />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
