'use client';

import { Copy, Download, MessageCircle, Share2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CERTAINTY_LABELS, type CertaintyLevel } from '@/lib/domain';
import { formatDate } from '@/lib/format';

// La conclusion d'une audience, prête à repartir par le même chemin que la rumeur : une image
// carrée 1080 × 1080 pour WhatsApp ou Facebook, et un court texte à coller. Dessinée dans le
// navigateur (canvas), sans bibliothèque. Les couleurs sont fixes : l'image sort de l'application.

const SIZE = 1080;
const PAD = 84;
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

function draw(
  canvas: HTMLCanvasElement,
  {
    claim,
    certainty,
    conclusion,
  }: { claim: string; certainty: CertaintyLevel; conclusion: string },
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
  context.font = `400 38px ${font}`;
  for (const line of wrap(context, conclusion, SIZE - PAD * 2, 6)) {
    context.fillText(line, PAD, y);
    y += 52;
  }

  context.fillStyle = COLORS.muted;
  context.font = `400 28px ${font}`;
  context.fillText(
    'Analyse assistée par IA, à partir des pièces du dossier.',
    PAD,
    SIZE - PAD - 80,
  );
  context.fillText(`MindStack · ${formatDate(new Date())}`, PAD, SIZE - PAD - 36);
}

export function shareText(claim: string, certainty: CertaintyLevel, conclusion: string) {
  return [
    `Information vérifiée : « ${claim} »`,
    `Conclusion : ${CERTAINTY_LABELS[certainty]}.`,
    conclusion,
    'Analyse assistée par IA, à partir des pièces du dossier. Vérifiez avant de partager.',
  ].join('\n\n');
}

export function ShareCard({
  claim,
  certainty,
  conclusion,
}: {
  claim: string;
  certainty: CertaintyLevel;
  conclusion: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canShareFile, setCanShareFile] = useState(false);
  const text = shareText(claim, certainty, conclusion);

  useEffect(() => {
    if (canvasRef.current) draw(canvasRef.current, { claim, certainty, conclusion });
    const probe = new File([''], 'carte.png', { type: 'image/png' });
    setCanShareFile(
      typeof navigator.canShare === 'function' && navigator.canShare({ files: [probe] }),
    );
  }, [claim, certainty, conclusion]);

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
        <div className="flex flex-wrap gap-2">
          <Button onClick={download}>
            <Download aria-hidden />
            Télécharger l’image
          </Button>
          {canShareFile && (
            <Button variant="outline" onClick={share}>
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
