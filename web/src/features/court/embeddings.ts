import 'server-only';
import { listCasesWithoutEmbedding, setCaseEmbeddings } from '@/server/dal/court';
import { embedTexts } from '@/server/processing';
import { caseSearchText } from './search';

// La recherche par le sens (« Déjà jugée ? », assistant, extension) compare une question au vecteur
// de chaque affaire. Un vecteur s'écrit à la conclusion du tribunal ; une affaire de démo ou jugée
// pendant une coupure de l’IA n’en a pas. On rattrape les vecteurs par lots de 100 au plus.
// Le résultat signale l’indisponibilité au tribunal ; la vérification rapide garde son repli par mots.
export async function embedMissingCases() {
  const missing = await listCasesWithoutEmbedding();
  if (missing.length === 0) return true;
  const vectors = await embedTexts(missing.map(caseSearchText));
  if (!vectors.ok) return false;
  await setCaseEmbeddings(
    missing.flatMap((item, index) => {
      const embedding = vectors.data[index];
      return embedding ? [{ id: item.id, embedding }] : [];
    }),
  );
  return true;
}
