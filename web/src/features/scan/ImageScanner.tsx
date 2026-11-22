'use client';

import {
  Download,
  ExternalLink,
  FileSearch,
  FolderInput,
  History,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { AiReading } from '@/components/common/AiReading';
import { AiSourceBadge } from '@/components/common/DomainBadges';
import { FileDrop } from '@/components/common/FileDrop';
import { ToneBadge } from '@/components/common/ToneBadge';
import { FormMessage } from '@/components/form/FormField';
import { LoadingState } from '@/components/states/States';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SCAN_OUTCOME_DESCRIPTIONS, SCAN_OUTCOME_LABELS, SCAN_OUTCOME_TONES } from '@/lib/domain';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { addScanToCase, analyzeImage, type SafeCopyView, type ScanView } from './actions';
import { fingerprintDistance, imageFingerprint } from './fingerprint';
import styles from './scan.module.css';
import { IMAGE_TYPES, MAX_IMAGE_DISTANCE } from './schema';

export const ENTER =
  'animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:slide-in-from-bottom-0';

// Fichiers prêts pour la démo sur scène : pas besoin d'ouvrir un sélecteur de fichiers.
const DEMO_IMAGES = [
  { label: 'Photo reçue par message', path: '/demo/inondation-virale.jpg' },
  { label: 'Photo d’origine', path: '/demo/inondation-2019.png' },
  { label: 'Image qui se déclare générée', path: '/demo/image-generee.png' },
];

export type KnownImage = { versionId: string; imagePath: string | null };
export type CaseOption = { id: string; title: string };

// Compare l'empreinte du fichier à celle des images de nos affaires, dans le navigateur.
async function findMatches(file: Blob, knownImages: KnownImage[]) {
  try {
    const mine = await imageFingerprint(file);
    const results = await Promise.all(
      knownImages.map(async ({ versionId, imagePath }) => {
        if (!imagePath) return null;
        const response = await fetch(imagePath);
        if (!response.ok) return null;
        const distance = fingerprintDistance(mine, await imageFingerprint(await response.blob()));
        return distance <= MAX_IMAGE_DISTANCE ? { versionId, distance } : null;
      }),
    );
    return results.filter((match) => match !== null);
  } catch {
    return []; // image illisible par le navigateur : l'étape « déjà vue » ne trouve rien
  }
}

export function Step({
  index,
  icon,
  title,
  ai = false,
  children,
}: {
  index: number;
  icon: ReactNode;
  title: string;
  // Une étape lue par l'IA : pointillés, et masquée en mode Sans IA.
  ai?: boolean;
  children: ReactNode;
}) {
  const heading = (
    <h3 className="flex items-center gap-2 font-semibold">
      {icon}
      {index + 1}. {title}
    </h3>
  );
  if (ai) {
    return (
      <AiReading
        label={title}
        showLabel={false}
        className={cn('gap-2 [animation-delay:160ms]', ENTER)}
      >
        {heading}
        {children}
      </AiReading>
    );
  }
  return (
    <section
      className={cn('grid content-start gap-2 surface p-4', ENTER)}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {heading}
      {children}
    </section>
  );
}

// Recherche inversée : ces services retrouvent les pages qui montrent déjà la même image. On
// n'envoie rien nous-mêmes : la personne y dépose l'image, et la plus ancienne page date la photo.
const REVERSE_SEARCH = [
  { name: 'Google Lens', url: 'https://lens.google.com/' },
  { name: 'TinEye', url: 'https://tineye.com/' },
  { name: 'Yandex Images', url: 'https://yandex.com/images/' },
  { name: 'Bing Visual Search', url: 'https://www.bing.com/visualsearch' },
];

function protectionSummary(copy: SafeCopyView): string {
  const parts = [
    copy.facesBlurred === 0
      ? 'aucun visage repéré'
      : `${copy.facesBlurred} visage${copy.facesBlurred > 1 ? 's floutés' : ' flouté'}`,
    copy.metadataRemoved
      ? 'informations cachées retirées (appareil, date, lieu)'
      : 'aucune information cachée à retirer',
  ];
  if (copy.firstFrameOnly) parts.push('première image seulement');
  return parts.join(', ');
}

function SafeCopyPanel({ copy, fileName }: { copy: SafeCopyView; fileName: string }) {
  const base = fileName.replace(/\.[^.]+$/, '') || 'image';
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-muted p-3">
      {/* biome-ignore lint/performance/noImgElement: data URL produite à la volée, rien à optimiser */}
      <img
        src={copy.dataUrl}
        alt="Copie protégée de l’image"
        className="size-20 shrink-0 rounded-lg object-cover"
      />
      <div className="grid min-w-0 flex-1 basis-56 gap-1.5">
        <p className="flex items-center gap-1.5 font-semibold text-sm">
          <ShieldCheck aria-hidden className="size-4 text-primary" />
          Copie protégée
        </p>
        <p className="text-muted-foreground text-sm text-pretty">
          {protectionSummary(copy)}. Déposez-la plutôt que l’original : les personnes de la photo ne
          sont pas exposées, et votre téléphone ne se trahit pas.
        </p>
        <Button variant="outline" size="sm" className="justify-self-start" asChild>
          <a href={copy.dataUrl} download={`${base}-copie-protegee.jpg`}>
            <Download aria-hidden />
            Télécharger la copie
          </a>
        </Button>
      </div>
    </div>
  );
}

export function ReverseSearchServices() {
  return (
    <ul className="flex flex-wrap gap-2">
      {REVERSE_SEARCH.map((service) => (
        <li key={service.name}>
          <Button variant="outline" size="sm" asChild>
            <a href={service.url} target="_blank" rel="noopener noreferrer">
              {service.name}
              <ExternalLink aria-hidden />
            </a>
          </Button>
        </li>
      ))}
    </ul>
  );
}

function ReverseSearchLinks({ scan }: { scan: ScanView }) {
  return (
    <div className="grid gap-2 border-t pt-3">
      <p className="text-muted-foreground text-sm text-pretty">
        Chercher ailleurs sur le web : déposez {scan.safeCopy ? 'la copie protégée' : 'l’image'} sur
        l’un de ces services. La page la plus ancienne qui la montre dit souvent d’où elle vient.
        Aucun résultat ne prouve rien.
      </p>
      {scan.safeCopy && <SafeCopyPanel copy={scan.safeCopy} fileName={scan.fileName} />}
      <ReverseSearchServices />
    </div>
  );
}

export function AddToCase({ scan, caseOptions }: { scan: ScanView; caseOptions: CaseOption[] }) {
  const [caseId, setCaseId] = useState(scan.alreadySeen?.caseId ?? caseOptions[0]?.id ?? '');
  const [pending, startTransition] = useTransition();

  function add() {
    startTransition(async () => {
      const result = await addScanToCase(scan.id, caseId);
      if (!result.ok) {
        toast.error(result.error.message);
        return;
      }
      const plural = result.data.added > 1 ? 's' : '';
      toast.success(`${result.data.added} pièce${plural} versée${plural} au dossier`, {
        action: { label: 'Voir', onClick: () => window.location.assign(`/court/${caseId}`) },
      });
    });
  }

  if (caseOptions.length === 0) return null;
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="grid gap-1.5">
        <Label htmlFor="scan-case">Verser les indices au dossier de</Label>
        <select
          id="scan-case"
          value={caseId}
          onChange={(event) => setCaseId(event.target.value)}
          className="h-9 rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {caseOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.title}
            </option>
          ))}
        </select>
      </div>
      <Button variant="outline" onClick={add} disabled={pending || !caseId}>
        <FolderInput aria-hidden />
        {pending ? 'Versement…' : 'Verser au dossier'}
      </Button>
    </div>
  );
}

function ImageResult({ scan, caseOptions }: { scan: ScanView; caseOptions: CaseOption[] }) {
  const { report, alreadySeen, reading, outcome } = scan;
  return (
    <div className="grid gap-4" aria-live="polite">
      {outcome && (
        <div className={cn('grid gap-1 rounded-xl bg-muted p-4', ENTER)}>
          <ToneBadge tone={SCAN_OUTCOME_TONES[outcome]} className="justify-self-start text-sm">
            {SCAN_OUTCOME_LABELS[outcome]}
          </ToneBadge>
          <p className="text-pretty">{SCAN_OUTCOME_DESCRIPTIONS[outcome]}</p>
        </div>
      )}

      <Step
        index={0}
        icon={<FileSearch aria-hidden className="size-5 text-primary" />}
        title="Ce que dit le fichier"
      >
        {report ? (
          <ul className="grid list-disc gap-1 pl-5">
            {report.findings.map((finding) => (
              <li key={finding}>{finding}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">Le fichier n’a pas pu être lu.</p>
        )}
      </Step>

      <Step
        index={1}
        icon={<History aria-hidden className="size-5 text-primary" />}
        title="Déjà vue ?"
      >
        {alreadySeen ? (
          <p className="text-pretty">
            <span className="font-semibold">Oui.</span> Cette image a été publiée le{' '}
            <span className="font-semibold">
              {alreadySeen.publishedAt
                ? formatDate(new Date(alreadySeen.publishedAt))
                : 'à une date inconnue'}
            </span>{' '}
            par {alreadySeen.sourceName}, dans l’affaire{' '}
            <Link
              href={`/cases/${alreadySeen.caseId}`}
              className="text-primary underline-offset-4 hover:underline"
            >
              « {alreadySeen.caseTitle} »
            </Link>
            .
          </p>
        ) : (
          <p className="text-muted-foreground">Pas retrouvée parmi les images de nos affaires.</p>
        )}
        <ReverseSearchLinks scan={scan} />
      </Step>

      <Step
        index={2}
        icon={<Sparkles aria-hidden className="size-5 text-primary" />}
        title="Lecture par l’IA"
        ai
      >
        {reading?.description && <p className="text-pretty">{reading.description}</p>}
        {reading && reading.observations.length > 0 ? (
          <ul className="grid list-disc gap-1 pl-5">
            {reading.observations.map((observation) => (
              <li key={observation}>{observation}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">
            {reading ? 'Aucune bizarrerie visible relevée.' : 'L’IA n’a pas lu cette image.'}
          </p>
        )}
        {reading?.textInImage && (
          <p className="text-sm">
            Texte dans l’image : <span className="italic">« {reading.textInImage} »</span>
          </p>
        )}
        <p className="text-muted-foreground text-sm">
          {scan.safeCopy
            ? 'L’IA a lu la copie protégée, pas l’original.'
            : 'Pas de copie protégée : l’image n’a pas été envoyée à l’IA.'}
        </p>
        {scan.aiSource && <AiSourceBadge source={scan.aiSource} />}
      </Step>

      <AddToCase scan={scan} caseOptions={caseOptions} />
    </div>
  );
}

export function ImageScanner({
  knownImages,
  caseOptions,
}: {
  knownImages: KnownImage[];
  caseOptions: CaseOption[];
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ScanView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  function analyze(file: File) {
    setError(null);
    setResult(null);
    setPreview(URL.createObjectURL(file));
    startTransition(async () => {
      const matches = await findMatches(file, knownImages);
      const formData = new FormData();
      formData.set('file', file);
      formData.set('matches', JSON.stringify(matches));
      const response = await analyzeImage(formData);
      if (response.ok) setResult(response.data);
      else setError(response.error.message);
    });
  }

  async function loadDemo(path: string) {
    const response = await fetch(path);
    const blob = await response.blob();
    analyze(new File([blob], path.split('/').pop() ?? 'image', { type: blob.type }));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="grid content-start gap-4">
        <FileDrop
          accept={IMAGE_TYPES.join(',')}
          label="Déposez une image, ou cliquez pour la choisir"
          hint="JPEG, PNG ou WebP, 8 Mo au plus"
          onFile={analyze}
          disabled={pending}
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-sm">Essayer avec :</span>
          {DEMO_IMAGES.map((demo) => (
            <Button
              key={demo.path}
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() => loadDemo(demo.path)}
            >
              {demo.label}
            </Button>
          ))}
        </div>
        {preview && (
          <div className={styles.frame}>
            {/* biome-ignore lint/performance/noImgElement: aperçu local d'un fichier choisi (URL blob), next/image ne s'applique pas. */}
            <img src={preview} alt="Fichier en cours d’analyse" className="block w-full" />
            {pending && (
              <>
                <div className={styles.dim} />
                <div className={styles.beam} />
              </>
            )}
          </div>
        )}
      </div>

      <div className="grid content-start gap-4">
        <FormMessage message={error} />
        {pending && <LoadingState title="Analyse de l’image…" />}
        {result && !pending && <ImageResult scan={result} caseOptions={caseOptions} />}
        {!result && !pending && !error && (
          <p className="rounded-xl border border-dashed p-6 text-muted-foreground">
            Trois étapes : ce que dit le fichier, s’il a déjà été vu ailleurs, et ce qu’en lit l’IA.
            Le scan relève des indices, il ne rend jamais de verdict.
          </p>
        )}
      </div>
    </div>
  );
}
