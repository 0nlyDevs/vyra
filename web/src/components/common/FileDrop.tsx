'use client';

import { Upload } from 'lucide-react';
import { type DragEvent, useId, useState } from 'react';
import { cn } from '@/lib/utils';

// Zone d'import d'un fichier (image, vocal) : clic ou glisser-déposer. Elle ne fait qu'une chose,
// donner le fichier choisi à `onFile` ; l'envoi et l'analyse restent dans la fonctionnalité.
export function FileDrop({
  accept,
  label = 'Déposez un fichier ici, ou cliquez pour le choisir',
  hint,
  onFile,
  disabled = false,
}: {
  accept: string;
  label?: string;
  hint?: string;
  onFile: (file: File) => void;
  disabled?: boolean;
}) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  function take(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    onFile(file);
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    if (!disabled) take(event.dataTransfer.files[0]);
  }

  return (
    <label
      htmlFor={inputId}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        'flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 hover:bg-muted',
        dragging && 'border-primary bg-accent',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      <Upload aria-hidden className="size-6 text-muted-foreground" />
      <span className="font-medium">{fileName ?? label}</span>
      {hint && <span className="text-muted-foreground text-sm">{hint}</span>}
      <input
        id={inputId}
        type="file"
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => take(event.target.files?.[0])}
      />
    </label>
  );
}
