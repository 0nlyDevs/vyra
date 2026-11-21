'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

// Image d'une publication, chargée chez sa source. Si la source la refuse ou si le réseau est
// coupé, la carte reste lisible sans elle.
export function FeedImage({ src, className }: { src: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    // biome-ignore lint/performance/noImgElement: images de sites tiers, tous domaines confondus ; next/image demanderait de les autoriser un par un.
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn(
        'aspect-[16/9] max-h-80 w-full rounded-xl border bg-muted object-cover',
        className,
      )}
    />
  );
}
