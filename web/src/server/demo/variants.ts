import 'server-only';
import { DEMO_CASE_IDS } from '@/server/demo/seed-data';

// Nom de la réponse de secours propre à une affaire de démo (`fallbacks/<prompt>--<nom>.json`
// dans processing). Ainsi, sans IA, l'audience d'une affaire de démo reste cohérente.
const VARIANT_BY_CASE: Record<string, string> = {
  [DEMO_CASE_IDS.flood]: 'flood',
  [DEMO_CASE_IDS.water]: 'water',
  [DEMO_CASE_IDS.hiring]: 'hiring',
};

export function demoVariantForCase(caseId: string): string | undefined {
  return VARIANT_BY_CASE[caseId];
}
