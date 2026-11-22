import 'server-only';
import { listCasesWithoutEmbedding, setCaseEmbeddings } from '@/server/dal/court';
import { embedTexts } from '@/server/processing';

// La recherche par le sens (« Déjà jugée ? », assistant, extension) compare une question au vecteur
// de chaque affaire. Un vecteur s'écrit à la conclusion du tribunal ; une affaire de démo ou jugée
// pendant une coupure de l'IA n'en a pas. On rattrape ce qui manque, quelques affaires à la fois,
// en silence : sans IA, la recherche repasse par les mots.
export async function embedMissingCases() {
  const missing = await listCasesWithoutEmbedding();
  if (missing.length === 0) return;
  const vectors = await embedTexts(missing.map((item) => item.claim.slice(0, 1000)));
  if (!vectors.ok) return;
  await setCaseEmbeddings(
    missing.flatMap((item, index) => {
      const embedding = vectors.data[index];
      return embedding ? [{ id: item.id, embedding }] : [];
    }),
  );
}
