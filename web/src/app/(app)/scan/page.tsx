import { AiNotice } from '@/components/common/AiNotice';
import { PageHeader } from '@/components/common/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Directory } from '@/features/impersonation/Directory';
import { ImpersonationCheck } from '@/features/impersonation/ImpersonationCheck';
import { AudioScanner } from '@/features/scan/AudioScanner';
import { ImageScanner } from '@/features/scan/ImageScanner';
import { LinkScanner } from '@/features/scan/LinkScanner';
import { VideoScanner } from '@/features/scan/VideoScanner';
import { isVerifier } from '@/lib/domain';
import { listCases } from '@/server/dal/cases';
import { listDirectory } from '@/server/dal/institutions';
import { listKnownImages } from '@/server/dal/scans';
import { videoAvailable } from '@/server/processing';
import { requireProfile } from '@/server/session';

export default async function ScanPage() {
  const [profile, knownImages, caseList, directory, canReadVideo] = await Promise.all([
    requireProfile(),
    listKnownImages(),
    listCases(),
    listDirectory(),
    videoAvailable(),
  ]);
  const caseOptions = caseList.map((item) => ({ id: item.id, title: item.title }));

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Module 1 · fonction complémentaire"
        title="Scan d’image, de vidéo, de vocal et de lien"
        description="Importer une image, une vidéo, un vocal ou un lien et relever des indices, ou vérifier qu’un message vient bien de l’institution qu’il cite. Jamais de verdict « IA ou pas » : les détecteurs se trompent trop."
      />
      <Tabs defaultValue="image" className="gap-6">
        <TabsList>
          <TabsTrigger value="image">Image</TabsTrigger>
          <TabsTrigger value="video">Vidéo</TabsTrigger>
          <TabsTrigger value="audio">Vocal</TabsTrigger>
          <TabsTrigger value="link">Lien</TabsTrigger>
          <TabsTrigger value="source">Est-ce bien eux ?</TabsTrigger>
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
        <TabsContent value="source" className="grid gap-10">
          <ImpersonationCheck />
          <Directory entries={directory} canEdit={isVerifier(profile.role)} />
        </TabsContent>
      </Tabs>
      <AiNotice>
        Indices relevés avec l’aide de l’IA. Ce ne sont pas des preuves : seules les pièces d’une
        affaire, jugées au tribunal, permettent de conclure.
      </AiNotice>
    </div>
  );
}
