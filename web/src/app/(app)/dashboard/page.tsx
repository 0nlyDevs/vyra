import { ArrowRight, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { CaseCard } from '@/components/common/CaseCard';
import { Doodle, DoodleNote } from '@/components/common/Doodle';
import { Reels } from '@/components/common/Reels';
import { EmptyState } from '@/components/states/States';
import { Button } from '@/components/ui/button';
import { PROFILE_ROLE_LABELS } from '@/lib/domain';
import { MODULE_ITEMS } from '@/lib/navigation';
import { listCases } from '@/server/dal/cases';
import { requireProfile } from '@/server/session';

export const metadata = { title: 'Accueil' };

// Accueil de l'espace connecté, mis en page comme un journal : un grand titre qui monte ligne à
// ligne, le champ « collez le message reçu » montré par une flèche dessinée, trois vidéos de ce
// qui circule ; puis les modules en cartes, puis les affaires en cours.

const delay = (seconds: number) => ({ '--d': `${seconds}s` }) as CSSProperties;

export default async function DashboardPage() {
  const profile = await requireProfile();
  const caseList = await listCases();
  const firstName = profile.name.split(' ')[0] ?? profile.name;

  return (
    <div className="grid gap-20 pb-10">
      <section className="grid grid-cols-[minmax(0,1fr)] items-start gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="relative pt-2">
          <p className="rise mb-5 font-medium text-muted-foreground text-sm">
            {PROFILE_ROLE_LABELS[profile.role]}
          </p>
          <h1 className="lines pub-display dashboard-title">
            <span>
              <span style={{ '--l': 0 } as CSSProperties}>Bonjour {firstName},</span>
            </span>
            <span>
              <span style={{ '--l': 1 } as CSSProperties}>
                que <span className="whitespace-nowrap">vérifie-t-on</span> <em>aujourd’hui</em>
                &nbsp;?
              </span>
            </span>
          </h1>
          <p className="pub-lead rise mt-7" style={delay(0.25)}>
            Collez le message reçu : Vyra retrouve d’où il vient et comment il a changé, puis le
            tribunal le juge sur pièces.
          </p>

          <div className="rise relative mt-14 max-w-3xl" style={delay(0.35)}>
            <DoodleNote className="-top-12 right-32" style={delay(0.9)}>
              commencez ici
            </DoodleNote>
            <Doodle
              className="-top-16 right-6 h-[84px] w-[96px] rotate-[18deg]"
              style={delay(1.1)}
            />
            <form action="/cases" className="pub-prompt grid gap-3 p-4 sm:p-5">
              <label htmlFor="dashboard-information" className="sr-only">
                Le message reçu
              </label>
              <textarea
                id="dashboard-information"
                name="information"
                rows={3}
                required
                minLength={10}
                placeholder="Collez ici le message reçu sur WhatsApp, Facebook…"
                className="w-full resize-none bg-transparent text-lg outline-none placeholder:text-muted-foreground"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link
                  href="/verifier"
                  className="text-muted-foreground text-sm underline-offset-4 hover:text-foreground hover:underline"
                >
                  Déjà vérifié ? Chercher sans compte
                </Link>
                <Button type="submit" size="lg">
                  Ouvrir l’analyse
                  <ArrowRight aria-hidden />
                </Button>
              </div>
            </form>
          </div>
        </div>
        <Reels />
      </section>

      <section aria-labelledby="modules-title">
        <hr className="mb-10 border-0 border-foreground border-t-2" />
        <h2 id="modules-title" className="pub-h2 mb-8">
          Les <em>modules</em>
        </h2>
        <ul className="mcard-grid">
          {MODULE_ITEMS.map((item, index) => (
            <li key={item.href} className="flex">
              <Link href={item.href} className="mcard">
                <span className="mcard-head">
                  <span className="mcard-icon">
                    <item.icon aria-hidden className="size-5" />
                  </span>
                  <span className="mcard-index">{String(index + 1).padStart(2, '0')}</span>
                </span>
                <span className="mcard-body">
                  <span className="mcard-word">{item.label}</span>
                  <span className="mcard-text">{item.description}</span>
                </span>
                <span className="mcard-foot">
                  <span>Ouvrir</span>
                  <span className="mcard-go">
                    <ArrowUpRight aria-hidden className="mcard-arrow size-[18px]" />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="cases-title">
        <hr className="mb-10 border-0 border-foreground border-t-2" />
        <h2 id="cases-title" className="pub-h2 mb-8">
          Affaires <em>en cours</em>
        </h2>
        {caseList.length === 0 ? (
          <EmptyState
            title="Aucune affaire pour l’instant."
            description="Le bouton « Réinitialiser la démo » recrée les affaires de démo."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {caseList.map((item) => (
              <CaseCard key={item.id} item={item} href={`/cases/${item.id}`} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
