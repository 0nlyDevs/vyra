'use client';

import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { SpeakButton } from '@/components/common/SpeakButton';
import { Button } from '@/components/ui/button';

// Le texte du flash, en gros caractères pour la lecture à l'antenne, à écouter ou à copier.
export function FlashScript({ script }: { script: string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(script);
      toast.success('Texte du flash copié');
    } catch {
      toast.error('Copie impossible dans ce navigateur.');
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <SpeakButton text={script} label="Écouter le flash" />
        <Button variant="outline" onClick={copy}>
          <Copy aria-hidden />
          Copier le texte
        </Button>
      </div>
      <div className="grid max-w-prose gap-4 text-pretty text-xl leading-relaxed">
        {script.split('\n\n').map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
}
