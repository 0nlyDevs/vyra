import Image from 'next/image';

// Une information du jeu présentée comme une publication du fil : le réflexe appris ici servira
// devant le vrai fil. Le titre n'est pas montré avant la réponse (il donnerait un indice).
export function PostCard({
  sourceName,
  content,
  imagePath,
}: {
  sourceName: string;
  content: string;
  imagePath: string | null;
}) {
  const initial = sourceName.match(/[\p{L}\p{N}]/u)?.[0]?.toUpperCase() ?? '?';
  return (
    <article className="grid content-start gap-4 rounded-xl border bg-card p-5 shadow-xs">
      <header className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted font-semibold"
        >
          {initial}
        </span>
        <div className="grid min-w-0 leading-tight">
          <p className="truncate font-medium">{sourceName}</p>
          <p className="text-muted-foreground text-sm">Publication partagée</p>
        </div>
      </header>
      <p className="text-lg leading-relaxed">{content}</p>
      {imagePath && (
        <Image
          src={imagePath}
          alt="Photo jointe à la publication"
          width={1200}
          height={800}
          className="h-auto w-full rounded-lg border"
        />
      )}
    </article>
  );
}
