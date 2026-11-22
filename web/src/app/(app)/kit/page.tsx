import { notFound } from 'next/navigation';
import { AiNotice } from '@/components/common/AiNotice';
import {
  AiSourceBadge,
  CaseStatusBadge,
  CertaintyBadge,
  EvidenceStanceBadge,
} from '@/components/common/DomainBadges';
import { PageHeader } from '@/components/common/PageHeader';
import { SpeechBubble } from '@/components/common/SpeechBubble';
import { Steps } from '@/components/common/Steps';
import { ToneBadge } from '@/components/common/ToneBadge';
import { FormField } from '@/components/form/FormField';
import { EmptyState, ErrorState, LoadingState } from '@/components/states/States';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DialogDemo, FileDropDemo, ToastDemo } from '@/features/kit/KitDemos';
import {
  AI_SOURCES,
  CASE_STATUSES,
  CERTAINTY_CRITERIA,
  CERTAINTY_LEVELS,
  EVIDENCE_STANCES,
  TONES,
} from '@/lib/domain';
import { env } from '@/lib/env';

// Le kit : tout ce qui existe déjà. Avant de créer un composant, vérifier qu'il n'est pas ici.
// Chaque bloc donne le fichier à importer.

const SWATCHES = [
  ['bg-primary', 'primary'],
  ['bg-accent', 'accent'],
  ['bg-muted', 'muted'],
  ['bg-card border', 'card'],
  ['bg-success-soft', 'success-soft'],
  ['bg-info-soft', 'info-soft'],
  ['bg-warning-soft', 'warning-soft'],
  ['bg-danger-soft', 'danger-soft'],
] as const;

function KitBlock({
  title,
  source,
  children,
}: {
  title: string;
  source: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        <p className="font-mono text-muted-foreground text-xs">{source}</p>
      </CardHeader>
      <CardContent className="grid gap-4">{children}</CardContent>
    </Card>
  );
}

export default function KitPage() {
  if (env.NODE_ENV !== 'development') notFound();
  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Base commune"
        title="Kit d’interface"
        description="Les couleurs et les composants partagés. On les réutilise tels quels, on n’en recrée pas."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <KitBlock title="Couleurs" source="src/app/globals.css">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SWATCHES.map(([className, name]) => (
              <div key={name} className="grid gap-1.5">
                <div className={`h-12 rounded-lg ${className}`} />
                <span className="font-mono text-xs">{name}</span>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground text-sm">
            Texte principal, <span className="text-primary">texte de marque</span> et texte
            secondaire. Jamais de couleur écrite en dur dans une page.
          </p>
        </KitBlock>

        <KitBlock title="Boutons" source="@/components/ui/button">
          <div className="flex flex-wrap items-center gap-2">
            <Button>Principal</Button>
            <Button variant="secondary">Secondaire</Button>
            <Button variant="outline">Contour</Button>
            <Button variant="ghost">Discret</Button>
            <Button variant="destructive">Supprimer</Button>
            <Button size="lg">Grand</Button>
            <Button size="sm">Petit</Button>
          </div>
        </KitBlock>

        <KitBlock title="Badges d’état" source="@/components/common/ToneBadge · DomainBadges">
          <div className="flex flex-wrap gap-2">
            {TONES.map((tone) => (
              <ToneBadge key={tone} tone={tone}>
                {tone}
              </ToneBadge>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {CASE_STATUSES.map((status) => (
              <CaseStatusBadge key={status} status={status} />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {EVIDENCE_STANCES.map((stance) => (
              <EvidenceStanceBadge key={stance} stance={stance} />
            ))}
            {AI_SOURCES.map((source) => (
              <AiSourceBadge key={source} source={source} />
            ))}
          </div>
        </KitBlock>

        <KitBlock title="Niveaux de certitude" source="@/lib/domain · CertaintyBadge">
          <ul className="grid gap-2">
            {CERTAINTY_LEVELS.map((level) => (
              <li key={level} className="flex flex-wrap items-center gap-2">
                <CertaintyBadge level={level} />
                <span className="text-muted-foreground text-sm">{CERTAINTY_CRITERIA[level]}</span>
              </li>
            ))}
          </ul>
          <AiNotice />
        </KitBlock>

        <KitBlock title="Bulles de parole" source="@/components/common/SpeechBubble">
          <SpeechBubble speaker="Accusation" caption="IA" tone="warning">
            La pièce n° 1 montre que la photo date de mars 2019.
          </SpeechBubble>
          <SpeechBubble speaker="Défense" caption="IA" tone="info">
            La pièce n° 4 confirme qu’il a plu cette nuit.
          </SpeechBubble>
          <SpeechBubble speaker="Vous" tone="primary" side="end">
            Je vote : trompeuse.
          </SpeechBubble>
        </KitBlock>

        <KitBlock title="Étapes" source="@/components/common/Steps">
          <Steps steps={['Lecture', 'Plaidoiries', 'Témoins', 'Vote', 'Conclusion']} current={2} />
        </KitBlock>

        <KitBlock title="États d’une page" source="@/components/states/States">
          <EmptyState title="Aucun signalement." description="Les nouveaux apparaîtront ici." />
          <ErrorState />
          <LoadingState title="Analyse en cours…" />
          <div className="grid gap-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </KitBlock>

        <KitBlock title="Formulaire" source="@/components/form/FormField">
          <FormField name="kit-url" label="Lien à vérifier" hint="Collez l’adresse de la page." />
          <FormField
            name="kit-reason"
            label="Motif"
            defaultValue="?"
            errors={['Écrivez au moins 10 caractères.']}
          />
        </KitBlock>

        <KitBlock title="Onglets et alerte" source="@/components/ui/tabs · alert">
          <Tabs defaultValue="calm">
            <TabsList>
              <TabsTrigger value="calm">Version calme</TabsTrigger>
              <TabsTrigger value="original">Originale</TabsTrigger>
            </TabsList>
            <TabsContent value="calm">Une coupure est prévue lundi de 10 h à 14 h.</TabsContent>
            <TabsContent value="original">10 JOURS sans eau ! Faites vos réserves !</TabsContent>
          </Tabs>
          <Alert>
            <AlertTitle>Exercice</AlertTitle>
            <AlertDescription>Cette version est fabriquée pour apprendre.</AlertDescription>
          </Alert>
        </KitBlock>

        <KitBlock title="Messages et fenêtre" source="sonner · @/components/ui/dialog">
          <ToastDemo />
          <DialogDemo />
        </KitBlock>

        <KitBlock title="Import de fichier" source="@/components/common/FileDrop">
          <FileDropDemo />
        </KitBlock>
      </div>
    </div>
  );
}
