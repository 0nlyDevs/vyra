import { AiNotice } from '@/components/common/AiNotice';
import { PageHeader } from '@/components/common/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Directory } from '@/features/impersonation/Directory';
import { ImpersonationCheck } from '@/features/impersonation/ImpersonationCheck';
import { AudioScanner } from '@/features/scan/AudioScanner';
import { ImageScanner } from '@/features/scan/ImageScanner';
import { LinkScanner } from '@/features/scan/LinkScanner';
import { VideoScanner } from '@/features/scan/VideoScanner';
import { SealCheckPanel } from '@/features/seal/SealCheckPanel';
import { QuickCheckPanel } from '@/features/signals/QuickCheckPanel';
import { isVerifier } from '@/lib/domain';
import { listCases } from '@/server/dal/cases';
import { listDirectory } from '@/server/dal/institutions';
import { listKnownImages } from '@/server/dal/scans';
import { videoAvailable } from '@/server/processing';
import { requireProfile } from '@/server/session';

export const metadata = { title: 'Scan' };

// Les onglets du scan, dans le même ordre que l'écran Scan de l'application mobile. `?tab=`
// ouvre l'un d'eux (les formulaires « Texte » et « Sceau » reviennent ici avec leur réponse).
const TABS = ['image', 'video', 'audio', 'link', 'text', 'source', 'seal'] as const;
type ScanTab = (typeof TABS)[number];

type ScanSearchParams = { tab?: string; q?: string; code?: string; c?: string; s?: string };

export default async function ScanPage({
  searchParams,
}: {
  searchParams: Promise<ScanSearchParams>;
}) {
  const params = await searchParams;
  const tab: ScanTab = TABS.find((item) => item === params.tab) ?? 'image';
  const [profile, knownImages, caseList, directory, canReadVideo] = await Promise.all([
    requireProfile(),
    listKnownImages(),
    listCases(),
    listDirectory(),
    videoAvailable(),
  ]);
  const caseOptions = caseList.map((item) => ({ id: item.id, title: item.title }));

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      <PageHeader
        eyebrow="Module 1 · fonction complémentaire"
        title="Scan"
        description="Une image, une vidéo, un vocal, un lien ou un texte reçu : relever des indices, retrouver ce qui a déjà été jugé, vérifier qu’un message vient bien de l’institution qu’il cite ou qu’une carte de conclusion est authentique. Jamais de verdict « IA ou pas » : les détecteurs se trompent trop."
      />
      <Tabs defaultValue={tab} className="min-w-0 gap-6">
        {/* Sept onglets : sur téléphone, la rangée défile de côté au lieu d’élargir la page. */}
        <TabsList className="max-w-full justify-start overflow-x-auto [scrollbar-width:none] [&>*]:shrink-0">
          <TabsTrigger value="image">Image</TabsTrigger>
          <TabsTrigger value="video">Vidéo</TabsTrigger>
          <TabsTrigger value="audio">Vocal</TabsTrigger>
          <TabsTrigger value="link">Lien</TabsTrigger>
          <TabsTrigger value="text">Texte</TabsTrigger>
          <TabsTrigger value="source">Est-ce bien eux ?</TabsTrigger>
          <TabsTrigger value="seal">Sceau</TabsTrigger>
        </TabsList>
        <TabsContent value="image">
          <ImageScanner knownImages={knownImages} caseOptions={caseOptions} />
        </TabsContent>
        <TabsContent value="video">
          <VideoScanner caseOptions={caseOptions} available={canReadVideo} />
        </TabsContent>
        <TabsContent value="audio">
          <AudioScanner />
        </TabsContent>
        <TabsContent value="link">
          <LinkScanner />
        </TabsContent>
        <TabsContent value="text">
          <QuickCheckPanel query={params.q ?? ''} />
        </TabsContent>
        <TabsContent value="source" className="grid gap-10">
          <ImpersonationCheck />
          <Directory entries={directory} canEdit={isVerifier(profile.role)} />
        </TabsContent>
        <TabsContent value="seal">
          <SealCheckPanel
            query={params}
            action="/scan"
            hidden={{ tab: 'seal' }}
            proofHref={(id) => `/cases/${id}`}
          />
        </TabsContent>
      </Tabs>
      <AiNotice>
        Indices relevés avec l’aide de l’IA. Ce ne sont pas des preuves : seules les pièces d’une
        affaire, jugées au tribunal, permettent de conclure.
      </AiNotice>
    </div>
  );
}
