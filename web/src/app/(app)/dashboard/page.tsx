import Link from 'next/link';
import { CaseCard } from '@/components/common/CaseCard';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/states/States';
import { PROFILE_ROLE_LABELS } from '@/lib/domain';
import { MODULE_ITEMS } from '@/lib/navigation';
import { listCases } from '@/server/dal/cases';
import { requireProfile } from '@/server/session';

// Accueil de l'espace connecté : les modules, puis les affaires en cours.
export default async function DashboardPage() {
  const profile = await requireProfile();
  const caseList = await listCases();

  return (
    <div className="grid gap-10">
      <PageHeader
        eyebrow={PROFILE_ROLE_LABELS[profile.role]}
        title={`Bonjour ${profile.name}`}
        description="Choisissez un module, ou ouvrez une affaire en cours."
      />

      <section aria-labelledby="modules-title" className="grid gap-4">
        <h2 id="modules-title" className="font-semibold text-xl">
          Modules
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {MODULE_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="grid gap-3 surface p-5 outline-none transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <item.icon aria-hidden className="size-5" />
              </span>
              <span className="font-medium text-lg">{item.label}</span>
              <span className="text-muted-foreground text-sm">{item.description}</span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="cases-title" className="grid gap-4">
        <h2 id="cases-title" className="font-semibold text-xl">
          Affaires en cours
        </h2>
        {caseList.length === 0 ? (
          <EmptyState
            title="Aucune affaire pour l’instant."
            description="Le bouton « Réinitialiser la démo » recrée les affaires de démo."
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {caseList.map((item) => (
              <CaseCard key={item.id} item={item} href={`/cases/${item.id}`} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
