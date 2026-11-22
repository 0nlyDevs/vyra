'use client';

import { Copy, Download, MessageCircle, Share2, ShieldCheck } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getConclusionSeal } from '@/features/seal/actions';
import type { Seal } from '@/features/seal/check';
import { CERTAINTY_LABELS, type CertaintyLevel } from '@/lib/domain';
import { formatDate } from '@/lib/format';

// La conclusion d'une audience, prête à repartir par le même chemin que la rumeur : une image
// carrée 1080 × 1080 pour WhatsApp ou Facebook, et un court texte à coller. Dessinée dans le
// navigateur (canvas), sans bibliothèque. Les couleurs sont fixes : l'image sort de l'application.

const SIZE = 1080;
const PAD = 84;
// Le QR du sceau, en bas à droite, sur un carré clair (les lecteurs lisent mal un QR inversé).
const QR = 232;
const QR_X = SIZE - PAD - QR;
const QR_Y = SIZE - PAD - QR;
const COLORS = {
  background: '#140c0d',
  panel: '#1f1415',
  text: '#f2ebe3',
  muted: '#b3a69c',
  red: '#e5484d',
};
// Une couleur par niveau, toujours avec son mot : jamais la couleur seule.
const LEVEL_COLORS: Record<CertaintyLevel, string> = {
  established: '#3fb37f',
  probable: '#5b9cf5',
  uncertain: '#e5a13b',
  contradicted: '#e5484d',
  insufficient: '#9a8f87',
};
const LEVEL_SYMBOLS: Record<CertaintyLevel, string> = {
  established: '✓',
  probable: '≈',
  uncertain: '?',
  contradicted: '✗',
  insufficient: '…',
};

function wrap(context: CanvasRenderingContext2D, text: string, width: number, maxLines: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= width) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = word;
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && words.join(' ') !== lines.join(' ')) {
    lines[maxLines - 1] = `${lines[maxLines - 1]?.replace(/[\s,.;:]*$/, '')}…`;
  }
  return lines;
}

async function draw(
  canvas: HTMLCanvasElement,
  {
    claim,
    certainty,
    conclusion,
    seal,
  }: { claim: string; certainty: CertaintyLevel; conclusion: string; seal: Seal | null },
) {
  const context = canvas.getContext('2d');
  if (!context) return;
  const font = getComputedStyle(document.body).fontFamily || 'sans-serif';
  const color = LEVEL_COLORS[certainty];
  context.fillStyle = COLORS.background;
  context.fillRect(0, 0, SIZE, SIZE);
  context.fillStyle = COLORS.red;
  context.fillRect(0, 0, SIZE, 12);

  context.textBaseline = 'top';
  context.fillStyle = COLORS.red;
  context.font = `600 30px ${font}`;
  context.fillText('INFORMATION VÉRIFIÉE', PAD, PAD);

  context.fillStyle = COLORS.muted;
  context.font = `400 34px ${font}`;
  context.fillText('Ce qui circule :', PAD, PAD + 70);
  context.fillStyle = COLORS.text;
  context.font = `italic 500 44px ${font}`;
  let y = PAD + 125;
  for (const line of wrap(context, `« ${claim} »`, SIZE - PAD * 2, 4)) {
    context.fillText(line, PAD, y);
    y += 58;
  }

  y += 40;
  context.fillStyle = color;
  context.beginPath();
  context.roundRect(PAD, y, SIZE - PAD * 2, 110, 24);
  context.fill();
  context.fillStyle = COLORS.background;
  context.font = `700 58px ${font}`;
  context.fillText(`${LEVEL_SYMBOLS[certainty]}  ${CERTAINTY_LABELS[certainty]}`, PAD + 36, y + 26);

  y += 150;
  context.fillStyle = COLORS.text;
  // La conclusion tient en entier avant le pied de la carte (le QR et ses lignes) : le texte
  // rapetisse s'il le faut, et ne se coupe qu'en dernier recours.
  const footerTop = (seal ? QR_Y : SIZE - PAD - 80) - 28;
  let fitted: { size: number; lines: string[] } | null = null;
  for (const size of [38, 34, 30, 27]) {
    context.font = `400 ${size}px ${font}`;
    const room = Math.max(1, Math.floor((footerTop - y) / (size * 1.37)));
    const lines = wrap(context, conclusion, SIZE - PAD * 2, room);
    fitted = { size, lines };
    if (!lines.at(-1)?.endsWith('…')) break;
  }
  for (const line of fitted?.lines ?? []) {
    context.fillText(line, PAD, y);
    y += (fitted?.size ?? 38) * 1.37;
  }

  const footerWidth = seal ? QR_X - PAD - 32 : SIZE - PAD * 2;
  if (seal) {
    context.fillStyle = COLORS.text;
    context.font = `700 40px ${font}`;
    context.fillText(`Sceau ${seal.code}`, PAD, QR_Y + 4, footerWidth);
    context.fillStyle = COLORS.muted;
    context.font = `400 28px ${font}`;
    context.fillText('Scannez le QR pour vérifier que', PAD, QR_Y + 62, footerWidth);
    context.fillText('cette carte n’a pas été modifiée.', PAD, QR_Y + 98, footerWidth);

    const qr = document.createElement('canvas');
    await QRCode.toCanvas(qr, seal.url, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: QR,
      color: { dark: '#0a0a0b', light: '#ffffff' },
    });
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.roundRect(QR_X - 8, QR_Y - 8, QR + 16, QR + 16, 16);
    context.fill();
    context.drawImage(qr, QR_X, QR_Y, QR, QR);
  } else {
    context.fillStyle = COLORS.muted;
    context.font = `400 28px ${font}`;
    context.fillText(
      'Analyse assistée par IA, à partir des pièces du dossier.',
      PAD,
      SIZE - PAD - 80,
      footerWidth,
    );
  }
  context.fillStyle = COLORS.muted;
  context.font = `400 28px ${font}`;
  context.fillText(`Vyra · ${formatDate(new Date())}`, PAD, SIZE - PAD - 36, footerWidth);
}

export function shareText(
  claim: string,
  certainty: CertaintyLevel,
  conclusion: string,
  seal: Seal | null = null,
) {
  return [
    `Information vérifiée : « ${claim} »`,
    `Conclusion : ${CERTAINTY_LABELS[certainty]}.`,
    conclusion,
    'Analyse assistée par IA, à partir des pièces du dossier. Vérifiez avant de partager.',
    ...(seal ? [`Sceau ${seal.code} · vérifier l’authenticité : ${seal.url}`] : []),
  ].join('\n\n');
}

export function ShareCard({
  caseId,
  claim,
  certainty,
  conclusion,
}: {
  caseId: string;
  claim: string;
  certainty: CertaintyLevel;
  conclusion: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canShareFile, setCanShareFile] = useState(false);
  // undefined : sceau en cours de calcul (on n'offre pas encore l'image) ; null : pas de sceau.
  const [seal, setSeal] = useState<Seal | null | undefined>(undefined);
  const text = shareText(claim, certainty, conclusion, seal ?? null);

  useEffect(() => {
    let cancelled = false;
    setSeal(undefined);
    getConclusionSeal(caseId)
      .then((result) => {
        if (!cancelled) setSeal(result.ok ? result.data : null);
      })
      .catch(() => {
        if (!cancelled) setSeal(null);
      });
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  useEffect(() => {
    if (canvasRef.current && seal !== undefined) {
      draw(canvasRef.current, { claim, certainty, conclusion, seal }).catch(() => {
        // QR impossible à dessiner : la carte reste lisible, sans QR.
      });
    }
    const probe = new File([''], 'carte.png', { type: 'image/png' });
    setCanShareFile(
      typeof navigator.canShare === 'function' && navigator.canShare({ files: [probe] }),
    );
  }, [claim, certainty, conclusion, seal]);

  function toBlob() {
    return new Promise<Blob | null>((resolve) => canvasRef.current?.toBlob(resolve, 'image/png'));
  }

  async function download() {
    const blob = await toBlob();
    if (!blob) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'conclusion-mindstack.png';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function share() {
    const blob = await toBlob();
    if (!blob) return;
    try {
      await navigator.share({
        files: [new File([blob], 'conclusion-mindstack.png', { type: 'image/png' })],
        text,
      });
    } catch {
      // Partage annulé : rien à faire.
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Texte copié');
    } catch {
      toast.error('Copie impossible dans ce navigateur.');
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,320px)_1fr] md:items-start">
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        className="w-full max-w-80 rounded-xl border"
        aria-label={`Carte à partager : ${CERTAINTY_LABELS[certainty]}`}
      />
      <div className="grid content-start gap-3">
        <p className="text-muted-foreground text-pretty">
          Renvoyez la conclusion par le même chemin que la rumeur : dans le groupe familial, sur la
          page du quartier. L’image dit le niveau de certitude en toutes lettres.
        </p>
        {seal && (
          <p className="flex items-start gap-2 text-pretty text-sm">
            <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>
              Carte scellée <span className="font-semibold tabular">{seal.code}</span> : son QR
              prouve qu’elle vient de Vyra et que son texte n’a pas été modifié.
            </span>
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button onClick={download} disabled={seal === undefined}>
            <Download aria-hidden />
            Télécharger l’image
          </Button>
          {canShareFile && (
            <Button variant="outline" onClick={share} disabled={seal === undefined}>
              <Share2 aria-hidden />
              Partager
            </Button>
          )}
          <Button variant="outline" asChild>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(text)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle aria-hidden />
              Envoyer sur WhatsApp
            </a>
          </Button>
          <Button variant="ghost" onClick={copy}>
            <Copy aria-hidden />
            Copier le texte
          </Button>
        </div>
      </div>
    </div>
  );
}
