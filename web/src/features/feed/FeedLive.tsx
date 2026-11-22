'use client';

import { ArrowUp, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { formatRelative } from '@/lib/format';
import { cn } from '@/lib/utils';
import { refreshFeedNow } from './actions';

// Le fil vit tout seul : à l'ouverture si la dernière récolte a plus de 10 minutes, puis toutes
// les 2 minutes (le serveur ne relit les sources que si c'est dû). Les nouvelles publications
// attendent un clic pour ne pas déplacer ce qu'on est en train de lire.
const CHECK_EVERY_MS = 2 * 60_000;

export function FeedLive({
  stale,
  empty,
  lastHarvest,
}: {
  stale: boolean;
  // Aucune publication encore : on affiche la première récolte dès qu'elle arrive.
  empty: boolean;
  lastHarvest: Date | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [waiting, setWaiting] = useState(0);
  const [unreachable, setUnreachable] = useState(false);

  const harvest = useCallback(
    (force: boolean, reveal: boolean) => {
      startTransition(async () => {
        const result = await refreshFeedNow(force);
        setUnreachable(!result.ok);
        if (!result.ok || !result.data.ran) return;
        if (reveal) {
          setWaiting(0);
          router.refresh();
        } else if (result.data.added > 0) {
          setWaiting((count) => count + result.data.added);
        }
      });
    },
    [router],
  );

  useEffect(() => {
    if (stale) harvest(false, empty);
    const timer = setInterval(() => harvest(false, false), CHECK_EVERY_MS);
    return () => clearInterval(timer);
  }, [harvest, stale, empty]);

  const reveal = () => {
    setWaiting(0);
    router.refresh();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-sm">
        <span aria-live="polite" suppressHydrationWarning>
          {pending
            ? 'Lecture des sources…'
            : unreachable
              ? 'Sources injoignables : dernière récolte affichée.'
              : lastHarvest
                ? `Mis à jour ${formatRelative(lastHarvest)}`
                : 'Pas encore de récolte.'}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => harvest(true, true)}
        >
          <RefreshCw aria-hidden className={cn(pending && 'animate-spin')} />
          Actualiser
        </Button>
      </div>
      {waiting > 0 && (
        <div className="pointer-events-none fixed inset-x-0 top-20 z-30 flex justify-center px-4">
          <Button
            type="button"
            size="sm"
            onClick={reveal}
            className="pointer-events-auto rounded-full shadow-(--shadow-float) transition-transform duration-150 ease-out active:scale-[0.97] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2"
          >
            <ArrowUp aria-hidden />
            {waiting === 1 ? '1 nouvelle publication' : `${waiting} nouvelles publications`}
          </Button>
        </div>
      )}
    </>
  );
}
