import { quickCheck } from '@/features/signals/quick-check';
import { clientIp, withinLimit } from '@/server/rate-limit';

// Vérification rapide pour l'extension du navigateur, sans compte : un texte sélectionné ou un
// lien. Renvoie l'affaire déjà jugée qui lui ressemble, les signes d'alerte relevés sans IA et les
// vérifications déjà publiées. Jamais de verdict nouveau (voir features/signals/quick-check.ts).
export async function POST(request: Request) {
  // Route publique qui appelle l'IA et lit des pages : limitée par adresse, comme les signalements.
  if (!(await withinLimit(`check:ip:${await clientIp()}`, 60, 60 * 60))) {
    return Response.json({ error: 'Trop de vérifications. Réessayez plus tard.' }, { status: 429 });
  }
  const outcome = await quickCheck(await request.json().catch(() => null));
  return outcome.ok
    ? Response.json(outcome.data)
    : Response.json({ error: outcome.message }, { status: outcome.status });
}
