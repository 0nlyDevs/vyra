import { submitReport } from '@/features/reports/actions';
import { isVerifier } from '@/lib/domain';
import { apiOk, apiResult, readJson, requireApiProfile } from '@/server/api';
import {
  listGroupsByReporterCount,
  listReportsByReporter,
  listReportsOfGroups,
} from '@/server/dal/reports';

// Boîte d'alertes, comme la page /reports : « mes signalements » pour tous ; pour le vérificateur,
// aussi les groupes d'alertes (du plus signalé au moins signalé) et leurs signalements.
export async function GET() {
  const auth = await requireApiProfile();
  if ('response' in auth) return auth.response;
  const verifier = isVerifier(auth.profile.role);
  const [mine, groups] = await Promise.all([
    listReportsByReporter(auth.profile.id),
    verifier ? listGroupsByReporterCount() : [],
  ]);
  const reports = await listReportsOfGroups(groups.map((group) => group.id));
  return apiOk({
    mine,
    groups: groups.map((group) => ({
      ...group,
      reports: reports.filter((report) => report.groupId === group.id),
    })),
    isVerifier: verifier,
  });
}

// Signaler un contenu : `{ content, url?, feedPostId?, reason, description? }`, mêmes règles que
// le formulaire du site (10 par jour, une fois par contenu).
export async function POST(request: Request) {
  const body = (await readJson(request)) as Record<string, unknown> | null;
  const form = new FormData();
  for (const key of ['content', 'url', 'feedPostId', 'reason', 'description']) {
    const value = body?.[key];
    if (typeof value === 'string') form.set(key, value);
  }
  return apiResult(await submitReport(null, form), 201);
}
