'use client';

import { FolderOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { openCaseNow } from './actions';

// « Ouvrir l'affaire maintenant » : le vérificateur n'attend pas le seuil de signaleurs.
export function OpenCaseButton({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const result = await openCaseNow(groupId);
      if (!result.ok) {
        toast.error(result.error.message, { id: `open-case-${groupId}` });
        return;
      }
      const { caseId } = result.data;
      toast.success('Affaire ouverte', {
        id: `open-case-${groupId}`,
        description: 'La vérification de ce contenu commence.',
        action: { label: 'Voir l’affaire', onClick: () => router.push(`/cases/${caseId}`) },
      });
    });
  }

  return (
    <Button variant="outline" onClick={onClick} disabled={pending}>
      <FolderOpen aria-hidden />
      {pending ? 'Ouverture…' : 'Ouvrir l’affaire maintenant'}
    </Button>
  );
}
