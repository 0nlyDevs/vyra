import { Gavel, Waypoints } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { openFromPost } from './actions';

// « Voir l'affaire » et « Ouvrir le tribunal » : ouvrent (ou retrouvent) l'affaire de la
// publication. `menu` : les deux entrées d'un menu ; sinon, deux boutons.
export function OpenPostForm({
  postId,
  target,
  variant = 'secondary',
}: {
  postId: string;
  target: 'case' | 'court';
  variant?: 'default' | 'secondary' | 'ghost';
}) {
  const Icon = target === 'case' ? Waypoints : Gavel;
  return (
    <form action={openFromPost}>
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="target" value={target} />
      <Button type="submit" variant={variant} size="sm">
        <Icon aria-hidden />
        {target === 'case' ? 'Voir l’affaire' : 'Ouvrir le tribunal'}
      </Button>
    </form>
  );
}

// Le même geste, en entrée de menu (ligne de la liste).
export function OpenPostMenuItem({ postId, target }: { postId: string; target: 'case' | 'court' }) {
  const Icon = target === 'case' ? Waypoints : Gavel;
  return (
    <form action={openFromPost}>
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="target" value={target} />
      <button
        type="submit"
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-foreground/[0.06]"
      >
        <Icon aria-hidden className="size-4 text-muted-foreground" />
        {target === 'case' ? 'Voir l’affaire' : 'Ouvrir le tribunal'}
      </button>
    </form>
  );
}
