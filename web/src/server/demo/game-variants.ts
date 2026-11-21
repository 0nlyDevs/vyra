import 'server-only';
import { DEMO_SCENARIO_IDS } from '@/server/demo/seed-data';

// Nom de la réponse de secours propre à une information du jeu
// (`processing/app/fallbacks/game-debrief--<nom>.json`). Sans IA, le conseil reste adapté.
const VARIANT_BY_SCENARIO: Record<string, string> = Object.fromEntries(
  Object.entries(DEMO_SCENARIO_IDS).map(([name, scenarioId]) => [scenarioId, name]),
);

export function demoVariantForScenario(scenarioId: string): string | undefined {
  return VARIANT_BY_SCENARIO[scenarioId];
}
