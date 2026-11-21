'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { FileDrop } from '@/components/common/FileDrop';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

// Démonstrations du kit qui ont besoin d'un clic : message, fenêtre, import de fichier.

export function ToastDemo() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => toast.success('Signalement envoyé')}>
        Message de réussite
      </Button>
      <Button variant="outline" onClick={() => toast.error('L’IA ne répond pas. Réessayez.')}>
        Message d’erreur
      </Button>
    </div>
  );
}

export function DialogDemo() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Ouvrir une fenêtre</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ouvrir l’audience ?</DialogTitle>
          <DialogDescription>
            Les deux avocats vont plaider à partir des pièces du dossier.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

export function FileDropDemo() {
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div className="grid gap-3">
      <FileDrop
        accept="image/*,audio/*"
        hint="Image ou vocal"
        onFile={(file) => setFileName(file.name)}
      />
      {fileName && (
        <div className="grid gap-1.5">
          <p className="text-muted-foreground text-sm">Fichier reçu : {fileName}</p>
          <Progress value={60} />
        </div>
      )}
    </div>
  );
}
