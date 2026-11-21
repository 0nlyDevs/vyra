import type { ReactNode } from 'react';

type Tag = 'h1' | 'h2' | 'h3' | 'p';

/** Titre ligne par ligne : chaque ligne sort d'un masque au défilement (voir useReveals). */
export function Lines({
  as: Tag = 'h2',
  lines,
  className = '',
  id,
}: {
  as?: Tag;
  lines: ReactNode[];
  className?: string;
  id?: string;
}) {
  return (
    <Tag id={id} className={`lines ${className}`} data-lines>
      {lines.map((line, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: les lignes sont fixes, leur rang est leur identité.
        <span className="line" key={index}>
          <span>{line}</span>
        </span>
      ))}
    </Tag>
  );
}
