import { AiNotice } from '@/components/common/AiNotice';
import { PageHeader } from '@/components/common/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AudioScanner } from '@/features/scan/AudioScanner';
import { ImageScanner } from '@/features/scan/ImageScanner';
import { LinkScanner } from '@/features/scan/LinkScanner';
import { listCases } from '@/server/dal/cases';
import { listKnownImages } from '@/server/dal/scans';

export default async function ScanPage() {
  const [knownImages, caseList] = await Promise.all([listKnownImages(), listCases()]);

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Module 1 · fonction complémentaire"
        title="Scan d’image, de vocal et de lien"
        description="Importer une image, un vocal ou un lien et relever des indices. Jamais de verdict « IA ou pas » : les détecteurs se trompent trop."
      />
      <Tabs defaultValue="image" className="gap-6">
        <TabsList>
          <TabsTrigger value="image">Image</TabsTrigger>
          <TabsTrigger value="audio">Vocal</TabsTrigger>
          <TabsTrigger value="link">Lien</TabsTrigger>
        </TabsList>
        <TabsContent value="image">
          <ImageScanner
            knownImages={knownImages}
            caseOptions={caseList.map((item) => ({ id: item.id, title: item.title }))}
          />
        </TabsContent>
        <TabsContent value="audio">
          <AudioScanner />
        </TabsContent>
        <TabsContent value="link">
          <LinkScanner />
        </TabsContent>
      </Tabs>
      <AiNotice>
        Indices relevés avec l’aide de l’IA. Ce ne sont pas des preuves : seules les pièces d’une
        affaire, jugées au tribunal, permettent de conclure.
      </AiNotice>
    </div>
  );
}
